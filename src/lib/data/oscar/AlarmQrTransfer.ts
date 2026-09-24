import {strFromU8, strToU8, unzlibSync, zlibSync} from "fflate";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    isGammaDataStream,
    isNeutronDataStream,
    isThresholdDataStream,
} from "@/lib/data/oscar/Utilities";
import {getGammaGrossCount, getNeutronGrossCount} from "@/app/utils/ChartUtils";

export const ALARM_TRANSFER_SCHEMA = "org.oscar.alarm-transfer";
export const ALARM_TRANSFER_VERSION = 1;
export const ALARM_QR_PREFIX = "OSCAR-ALARM:1:";
export const MAX_ALARM_QR_CHARACTERS = 2200;

const BASE45_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
const ALARM_QR_SEPARATOR = "/";
const MAX_QR_COMPRESSED_BYTES = 4096;
const MAX_DECOMPRESSED_BYTES = 128 * 1024;
const MAX_OBSERVATIONS_PER_SERIES = 10_000;

export interface AlarmSeriesPoint {
    timestamp: number;
    value: number;
}

export type CompactAlarmPoint = [offsetMilliseconds: number, value: number];

export interface CompactAlarmSeries {
    originalCount: number;
    exportedCount: number;
    points?: CompactAlarmPoint[];
    constant?: number;
    unit: "cps";
    downsampled: boolean;
}

export interface AlarmTransferPayload {
    schema: typeof ALARM_TRANSFER_SCHEMA;
    version: typeof ALARM_TRANSFER_VERSION;
    exportedAt: string;
    exportProfile: "qr-downsampled";
    source: {
        nodeId: string;
        nodeName?: string;
        laneId: string;
    };
    event: {
        occupancyId: string;
        observationId?: string;
        startTime: string;
        endTime: string;
        status: string;
        maxGamma?: number;
        maxNeutron?: number;
        neutronBackground?: number;
        secondaryInspection?: string;
        vehicleId?: string;
        adjudicationCode?: number;
        adjudicationLabel?: string;
        isotopes?: string[];
        feedback?: string;
    };
    series: {
        timeOrigin: string;
        gamma: CompactAlarmSeries;
        neutron: CompactAlarmSeries;
        threshold: CompactAlarmSeries;
        fullResolutionSha256: string;
    };
    authenticity: {
        signed: false;
        notice: "integrity-only";
    };
}

export interface AlarmTransferDocument {
    payload: AlarmTransferPayload;
    integrity: {
        algorithm: "SHA-256";
        digest: string;
    };
    transport: string;
}

export interface AlarmTransferBuildResult extends AlarmTransferDocument {
    qrCharacters: number;
    qrFits: boolean;
}

interface SamplingBudget {
    gamma: number;
    neutron: number;
    threshold: number;
}

const SAMPLING_BUDGETS: SamplingBudget[] = [
    {gamma: 64, neutron: 32, threshold: 32},
    {gamma: 48, neutron: 24, threshold: 24},
    {gamma: 32, neutron: 16, threshold: 16},
    {gamma: 24, neutron: 12, threshold: 12},
];

function asFiniteNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function roundMeasurement(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function timestampFromObservation(observation: any, fallback: number): number {
    const raw = observation?.phenomenonTime
        ?? observation?.resultTime
        ?? observation?.properties?.phenomenonTime
        ?? observation?.properties?.resultTime;
    const value = typeof raw === "object" ? raw?.begin ?? raw?.start ?? raw?.end : raw;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSeries(points: AlarmSeriesPoint[]): AlarmSeriesPoint[] {
    const sorted = points
        .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
        .sort((left, right) => left.timestamp - right.timestamp);
    const deduplicated: AlarmSeriesPoint[] = [];
    for (const point of sorted) {
        const previous = deduplicated[deduplicated.length - 1];
        const normalized = {timestamp: point.timestamp, value: roundMeasurement(point.value)};
        if (previous?.timestamp === normalized.timestamp) deduplicated[deduplicated.length - 1] = normalized;
        else deduplicated.push(normalized);
    }
    return deduplicated;
}

function evenlySelect(indices: number[], count: number): number[] {
    if (indices.length <= count) return indices;
    if (count <= 0) return [];
    if (count === 1) return [indices[Math.floor(indices.length / 2)]];
    const selected: number[] = [];
    for (let position = 0; position < count; position++) {
        const index = Math.round(position * (indices.length - 1) / (count - 1));
        selected.push(indices[index]);
    }
    return Array.from(new Set(selected));
}

/**
 * Reduces a time series while retaining endpoints, global extrema, explicitly
 * critical points, and the min/max pair from each remaining time bucket.
 */
export function downsampleAlarmSeries(
    input: AlarmSeriesPoint[],
    maximumPoints: number,
    criticalIndices: number[] = [],
): AlarmSeriesPoint[] {
    const points = normalizeSeries(input);
    if (maximumPoints < 2) throw new Error("At least two output points are required.");
    if (points.length <= maximumPoints) return points;

    let minimumIndex = 0;
    let maximumIndex = 0;
    for (let index = 1; index < points.length; index++) {
        if (points[index].value < points[minimumIndex].value) minimumIndex = index;
        if (points[index].value > points[maximumIndex].value) maximumIndex = index;
    }

    const mandatory = new Set<number>([0, points.length - 1, minimumIndex, maximumIndex]);
    criticalIndices
        .filter(index => Number.isInteger(index) && index >= 0 && index < points.length)
        .forEach(index => mandatory.add(index));

    if (mandatory.size > maximumPoints) {
        const fixed = new Set<number>([0, points.length - 1, minimumIndex, maximumIndex]);
        const remainingCritical = Array.from(mandatory)
            .filter(index => !fixed.has(index))
            .sort((left, right) => left - right);
        evenlySelect(remainingCritical, Math.max(0, maximumPoints - fixed.size))
            .forEach(index => fixed.add(index));
        return Array.from(fixed).sort((left, right) => left - right).map(index => points[index]);
    }

    const selected = new Set(mandatory);
    const bucketCount = Math.max(1, Math.floor((maximumPoints - selected.size) / 2));
    for (let bucket = 0; bucket < bucketCount; bucket++) {
        const start = 1 + Math.floor(bucket * (points.length - 2) / bucketCount);
        const end = 1 + Math.floor((bucket + 1) * (points.length - 2) / bucketCount);
        if (start >= end) continue;

        let localMinimum = start;
        let localMaximum = start;
        for (let index = start + 1; index < end; index++) {
            if (points[index].value < points[localMinimum].value) localMinimum = index;
            if (points[index].value > points[localMaximum].value) localMaximum = index;
        }
        selected.add(localMinimum);
        selected.add(localMaximum);
    }

    const optional = Array.from(selected)
        .filter(index => !mandatory.has(index))
        .sort((left, right) => left - right);
    const result = new Set(mandatory);
    evenlySelect(optional, maximumPoints - result.size).forEach(index => result.add(index));

    if (result.size < maximumPoints) {
        const unselected = points.map((_, index) => index).filter(index => !result.has(index));
        evenlySelect(unselected, maximumPoints - result.size).forEach(index => result.add(index));
    }

    return Array.from(result).sort((left, right) => left - right).map(index => points[index]);
}

function thresholdAt(timestamp: number, threshold: AlarmSeriesPoint[]): number | undefined {
    if (threshold.length === 0) return undefined;
    let latest = threshold[0];
    for (const point of threshold) {
        if (point.timestamp > timestamp) break;
        latest = point;
    }
    return latest.value;
}

export function findThresholdCrossingIndices(
    gammaInput: AlarmSeriesPoint[],
    thresholdInput: AlarmSeriesPoint[],
): number[] {
    const gamma = normalizeSeries(gammaInput);
    const threshold = normalizeSeries(thresholdInput);
    const crossings = new Set<number>();
    for (let index = 1; index < gamma.length; index++) {
        const previousThreshold = thresholdAt(gamma[index - 1].timestamp, threshold);
        const currentThreshold = thresholdAt(gamma[index].timestamp, threshold);
        if (previousThreshold === undefined || currentThreshold === undefined) continue;
        const previousDelta = gamma[index - 1].value - previousThreshold;
        const currentDelta = gamma[index].value - currentThreshold;
        if (previousDelta === 0 || currentDelta === 0 || Math.sign(previousDelta) !== Math.sign(currentDelta)) {
            crossings.add(index - 1);
            crossings.add(index);
        }
    }
    return Array.from(crossings);
}

function compactSeries(points: AlarmSeriesPoint[], originalCount: number, origin: number): CompactAlarmSeries {
    return {
        originalCount,
        exportedCount: points.length,
        points: points.map(point => [Math.max(0, Math.round(point.timestamp - origin)), roundMeasurement(point.value)]),
        unit: "cps",
        downsampled: points.length < originalCount,
    };
}

function compactThreshold(points: AlarmSeriesPoint[], originalCount: number, origin: number): CompactAlarmSeries {
    const uniqueValues = new Set(points.map(point => point.value));
    if (uniqueValues.size === 1) {
        return {
            originalCount,
            exportedCount: 1,
            constant: points[0].value,
            unit: "cps",
            downsampled: originalCount > 1,
        };
    }
    return compactSeries(points, originalCount, origin);
}

export function base45Encode(bytes: Uint8Array): string {
    let output = "";
    for (let index = 0; index < bytes.length; index += 2) {
        if (index + 1 < bytes.length) {
            let value = bytes[index] * 256 + bytes[index + 1];
            const first = value % 45;
            value = Math.floor(value / 45);
            const second = value % 45;
            const third = Math.floor(value / 45);
            output += BASE45_ALPHABET[first] + BASE45_ALPHABET[second] + BASE45_ALPHABET[third];
        } else {
            const first = bytes[index] % 45;
            const second = Math.floor(bytes[index] / 45);
            output += BASE45_ALPHABET[first] + BASE45_ALPHABET[second];
        }
    }
    return output;
}

export function base45Decode(value: string): Uint8Array {
    if (value.length % 3 === 1) throw new Error("Invalid Base45 length.");
    const output: number[] = [];
    for (let index = 0; index < value.length;) {
        const remaining = value.length - index;
        const groupLength = remaining >= 3 ? 3 : 2;
        const first = BASE45_ALPHABET.indexOf(value[index]);
        const second = BASE45_ALPHABET.indexOf(value[index + 1]);
        if (first < 0 || second < 0) throw new Error("Invalid Base45 character.");
        let decoded = first + second * 45;
        if (groupLength === 3) {
            const third = BASE45_ALPHABET.indexOf(value[index + 2]);
            if (third < 0) throw new Error("Invalid Base45 character.");
            decoded += third * 45 * 45;
            if (decoded > 0xffff) throw new Error("Invalid Base45 value.");
            output.push(Math.floor(decoded / 256), decoded % 256);
        } else {
            if (decoded > 0xff) throw new Error("Invalid Base45 value.");
            output.push(decoded);
        }
        index += groupLength;
    }
    return Uint8Array.from(output);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const digestInput = Uint8Array.from(bytes).buffer;
    const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput);
    return Array.from(new Uint8Array(digest))
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");
}

function constantTimeEqual(left: string, right: string): boolean {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index++) {
        difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
}

function assertPayload(payload: any): asserts payload is AlarmTransferPayload {
    if (!payload || payload.schema !== ALARM_TRANSFER_SCHEMA || payload.version !== ALARM_TRANSFER_VERSION)
        throw new Error("Unsupported OSCAR alarm transfer format.");
    if (!payload.event || typeof payload.event.occupancyId !== "string")
        throw new Error("Alarm transfer is missing its event identity.");
    if (!payload.series || typeof payload.series.timeOrigin !== "string")
        throw new Error("Alarm transfer is missing chart data.");
    if (!payload.source || typeof payload.source.nodeId !== "string" || typeof payload.source.laneId !== "string")
        throw new Error("Alarm transfer is missing its source identity.");
    if (payload.source.nodeId.length > 128 || payload.source.laneId.length > 128 || payload.event.occupancyId.length > 128)
        throw new Error("Alarm transfer identity exceeds supported limits.");
    if (!Number.isFinite(Date.parse(payload.event.startTime))
        || !Number.isFinite(Date.parse(payload.event.endTime))
        || !Number.isFinite(Date.parse(payload.series.timeOrigin)))
        throw new Error("Alarm transfer contains an invalid timestamp.");
    if (!/^[0-9a-f]{64}$/i.test(payload.series.fullResolutionSha256))
        throw new Error("Alarm transfer is missing its source-data digest.");
    if (payload.authenticity?.signed !== false || payload.authenticity?.notice !== "integrity-only")
        throw new Error("Alarm transfer has unsupported authenticity metadata.");
    for (const name of ["gamma", "neutron", "threshold"] as const) {
        const series = payload.series[name];
        if (!series
            || !Number.isInteger(series.exportedCount)
            || !Number.isInteger(series.originalCount)
            || series.exportedCount < 0
            || series.originalCount < series.exportedCount
            || series.exportedCount > 256
            || series.originalCount > MAX_OBSERVATIONS_PER_SERIES)
            throw new Error("Alarm transfer series exceeds supported limits.");
        if (series.points && (!Array.isArray(series.points) || series.points.length !== series.exportedCount))
            throw new Error("Alarm transfer series is malformed.");
        if (series.points?.some((point: unknown) => !Array.isArray(point)
            || point.length !== 2
            || !Number.isFinite(point[0])
            || point[0] < 0
            || !Number.isFinite(point[1])))
            throw new Error("Alarm transfer series contains an invalid point.");
        if (series.constant !== undefined && !Number.isFinite(series.constant))
            throw new Error("Alarm transfer series contains an invalid constant.");
    }
}

export async function encodeAlarmTransfer(payload: AlarmTransferPayload): Promise<AlarmTransferDocument> {
    assertPayload(payload);
    const jsonBytes = strToU8(JSON.stringify(payload));
    const digest = await sha256Hex(jsonBytes);
    const compressed = zlibSync(jsonBytes, {level: 9});
    // Uppercase hexadecimal plus a Base45-compatible separator keeps the
    // transport in QR alphanumeric mode, allowing more data at a given size.
    const transport = `${ALARM_QR_PREFIX}${base45Encode(compressed)}${ALARM_QR_SEPARATOR}${digest.toUpperCase()}`;
    return {
        payload,
        integrity: {algorithm: "SHA-256", digest},
        transport,
    };
}

export async function decodeAlarmTransfer(transport: string): Promise<AlarmTransferDocument> {
    const trimmed = transport.trim();
    if (!trimmed.startsWith(ALARM_QR_PREFIX)) throw new Error("Not an OSCAR alarm QR code.");
    const separator = trimmed.lastIndexOf(ALARM_QR_SEPARATOR);
    if (separator <= ALARM_QR_PREFIX.length) throw new Error("Alarm QR integrity value is missing.");
    const encoded = trimmed.slice(ALARM_QR_PREFIX.length, separator);
    const expectedDigest = trimmed.slice(separator + 1).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expectedDigest)) throw new Error("Alarm QR integrity value is invalid.");

    const compressed = base45Decode(encoded);
    if (compressed.length > MAX_QR_COMPRESSED_BYTES) throw new Error("Alarm QR payload is too large.");
    const jsonBytes = unzlibSync(compressed);
    if (jsonBytes.length > MAX_DECOMPRESSED_BYTES) throw new Error("Alarm QR expanded payload is too large.");
    const actualDigest = await sha256Hex(jsonBytes);
    if (!constantTimeEqual(actualDigest, expectedDigest)) throw new Error("Alarm QR integrity check failed.");

    const payload = JSON.parse(strFromU8(jsonBytes));
    assertPayload(payload);
    return {
        payload,
        integrity: {algorithm: "SHA-256", digest: actualDigest},
        transport: trimmed,
    };
}

export async function parseAlarmTransferFile(text: string): Promise<AlarmTransferDocument> {
    if (text.length > MAX_DECOMPRESSED_BYTES * 2) throw new Error("Alarm transfer file is too large.");
    const parsed = JSON.parse(text);
    if (typeof parsed?.transport === "string") return decodeAlarmTransfer(parsed.transport);
    throw new Error("Alarm transfer file does not contain a QR transport payload.");
}

async function fetchSeries(
    lane: LaneMapEntry,
    event: EventTableData,
    streamPredicate: (stream: any) => boolean,
    valueReader: (result: any) => number | undefined,
): Promise<AlarmSeriesPoint[]> {
    const stream = lane.datastreams.find(streamPredicate);
    if (!stream) return [];

    const query = await stream.searchObservations(
        new ObservationFilter({resultTime: `${event.startTime}/${event.endTime}`}),
        500,
    );
    const observations: any[] = [];
    while (query.hasNext() && observations.length < MAX_OBSERVATIONS_PER_SERIES) {
        const page = await query.nextPage();
        observations.push(...page.slice(0, MAX_OBSERVATIONS_PER_SERIES - observations.length));
    }

    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();
    const fallbackStep = observations.length > 1 ? Math.max(1, (end - start) / (observations.length - 1)) : 0;
    return normalizeSeries(observations.flatMap((observation, index) => {
        const value = valueReader(observation?.result);
        if (value === undefined) return [];
        return [{
            timestamp: timestampFromObservation(observation, start + index * fallbackStep),
            value,
        }];
    }));
}

function compactText(value: unknown, maximumLength: number): string | undefined {
    if (typeof value !== "string") return undefined;
    const compacted = value.trim();
    if (!compacted) return undefined;
    return compacted.slice(0, maximumLength);
}

async function fullSeriesDigest(
    gamma: AlarmSeriesPoint[],
    neutron: AlarmSeriesPoint[],
    threshold: AlarmSeriesPoint[],
): Promise<string> {
    return sha256Hex(strToU8(JSON.stringify({gamma, neutron, threshold})));
}

function buildPayload(
    event: EventTableData,
    lane: LaneMapEntry,
    gamma: AlarmSeriesPoint[],
    neutron: AlarmSeriesPoint[],
    threshold: AlarmSeriesPoint[],
    sourceDigest: string,
    budget: SamplingBudget,
): AlarmTransferPayload {
    const startMilliseconds = new Date(event.startTime).getTime();
    const origin = Number.isFinite(startMilliseconds)
        ? startMilliseconds
        : Math.min(...[...gamma, ...neutron, ...threshold].map(point => point.timestamp));
    const crossingIndices = findThresholdCrossingIndices(gamma, threshold);
    const sampledGamma = downsampleAlarmSeries(gamma, budget.gamma, crossingIndices);
    const sampledNeutron = downsampleAlarmSeries(neutron, budget.neutron);
    const sampledThreshold = threshold.length > 0
        ? downsampleAlarmSeries(threshold, budget.threshold)
        : [];
    const adjudication = event.adjudicatedData;
    const node = lane.parentNode as any;

    return {
        schema: ALARM_TRANSFER_SCHEMA,
        version: ALARM_TRANSFER_VERSION,
        exportedAt: new Date().toISOString(),
        exportProfile: "qr-downsampled",
        source: {
            nodeId: String(node?.id ?? event.parentNode ?? "unknown"),
            nodeName: compactText(node?.name, 80),
            laneId: event.laneId,
        },
        event: {
            occupancyId: String(event.occupancyCount),
            observationId: compactText(event.occupancyObsId, 128),
            startTime: event.startTime,
            endTime: event.endTime,
            status: event.status,
            maxGamma: asFiniteNumber(event.maxGamma),
            maxNeutron: asFiniteNumber(event.maxNeutron),
            neutronBackground: asFiniteNumber(event.neutronBackground),
            secondaryInspection: compactText(event.secondaryInspection, 32),
            vehicleId: compactText(adjudication?.vehicleId, 64),
            adjudicationCode: asFiniteNumber(adjudication?.adjudicationCode?.code),
            adjudicationLabel: compactText(adjudication?.adjudicationCode?.label, 96),
            isotopes: adjudication?.isotopes?.slice(0, 16).map(value => String(value).slice(0, 64)),
            feedback: compactText(adjudication?.feedback, 256),
        },
        series: {
            timeOrigin: new Date(origin).toISOString(),
            gamma: compactSeries(sampledGamma, gamma.length, origin),
            neutron: compactSeries(sampledNeutron, neutron.length, origin),
            threshold: sampledThreshold.length > 0
                ? compactThreshold(sampledThreshold, threshold.length, origin)
                : {originalCount: 0, exportedCount: 0, points: [], unit: "cps", downsampled: false},
            fullResolutionSha256: sourceDigest,
        },
        authenticity: {
            signed: false,
            notice: "integrity-only",
        },
    };
}

export async function buildAlarmTransfer(
    event: EventTableData,
    lane: LaneMapEntry,
): Promise<AlarmTransferBuildResult> {
    const [gamma, neutron, threshold] = await Promise.all([
        fetchSeries(lane, event, isGammaDataStream, getGammaGrossCount),
        fetchSeries(lane, event, isNeutronDataStream, getNeutronGrossCount),
        fetchSeries(lane, event, isThresholdDataStream, result => asFiniteNumber(result?.threshold)),
    ]);
    if (gamma.length === 0 && neutron.length === 0)
        throw new Error("No gamma or neutron observations are available for this alarm.");

    const sourceDigest = await fullSeriesDigest(gamma, neutron, threshold);
    let lastResult: AlarmTransferDocument | undefined;
    for (const budget of SAMPLING_BUDGETS) {
        const payload = buildPayload(event, lane, gamma, neutron, threshold, sourceDigest, budget);
        const result = await encodeAlarmTransfer(payload);
        lastResult = result;
        if (result.transport.length <= MAX_ALARM_QR_CHARACTERS) {
            return {...result, qrCharacters: result.transport.length, qrFits: true};
        }
    }
    if (!lastResult) throw new Error("Alarm transfer could not be created.");
    return {...lastResult, qrCharacters: lastResult.transport.length, qrFits: false};
}

export function alarmTransferFileName(payload: AlarmTransferPayload): string {
    const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "");
    return `oscar-alarm-${safe(payload.source.laneId)}-${safe(payload.event.occupancyId)}.oscar-alarm.json`;
}

export function serializeAlarmTransferDocument(document: AlarmTransferDocument): string {
    return JSON.stringify(document, null, 2);
}
