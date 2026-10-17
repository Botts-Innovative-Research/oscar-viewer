import {INode} from "@/lib/data/osh/Node";

export const RETAINED_MEDIA_SCHEMA_VERSION = 1;
export const RETAINED_FRAME_COUNT = 5;
export const MAX_RETAINED_MEDIA_SETS = 8;
export const MAX_RETAINED_CATALOG_BYTES = 1024 * 1024;
export const MAX_RETAINED_FRAME_BYTES = 12 * 1024 * 1024;
export const MAX_RETAINED_FRAME_DIMENSION = 6000;
export const MAX_RETAINED_FRAME_PIXELS = 20_000_000;
export const MAX_RETAINED_EVENT_BYTES = 64 * 1024 * 1024;
export const MAX_RETAINED_EVENT_PIXELS = 120_000_000;

export const RETAINED_FRAME_POSITIONS = [
    "FIRST",
    "QUARTER",
    "MIDDLE",
    "THREE_QUARTERS",
    "LAST",
] as const;

export type RetainedFramePosition = typeof RETAINED_FRAME_POSITIONS[number];
export type RetainedMediaFetch = (
    input: RequestInfo | URL,
    init?: RequestInit,
) => Promise<Response>;

export type RetainedMediaNode = Pick<INode,
    "address" | "port" | "isSecure" | "isDefaultNode" | "oshPathRoot"
    | "bucketsEndpoint" | "getBasicAuthHeader">;

export interface RetainedMediaAsset {
    position: RetainedFramePosition;
    contentType: "image/jpeg";
    sha256: string;
    bytes: number;
    width: number;
    height: number;
    sourceFrameOrdinal: number;
    sourcePts: number;
    sourcePtsSeconds: number;
    state: "PUBLISHED";
}

export interface RetainedMediaAssetResponse {
    asset: RetainedMediaAsset;
    path: string;
}

export interface RetainedMediaManifest {
    schemaVersion: number;
    mediaSetId: string;
    eventId: string;
    laneUid: string;
    cameraUid: string;
    createdAt: string;
    jpegQuality: number;
    lifecycleState: "AVAILABLE" | "HELD";
    hold: {
        active: boolean;
        reason: string;
        placedAt: string | null;
    };
    source: {
        objectKey: string;
        sha256: string;
        bytes: number;
        codec: string;
        durationMicros: number;
        rollbackDeleteAfter: string;
        state: "PRESERVED_FOR_ROLLBACK" | "ELIGIBLE_FOR_DELETION" | "DELETED";
    };
    assets: RetainedMediaAsset[];
}

export interface RetainedMediaSetResponse {
    manifest: RetainedMediaManifest;
    manifestPath: string;
    assets: RetainedMediaAssetResponse[];
}

export interface RetainedEventMediaResponse {
    schemaVersion: number;
    eventId: string;
    mediaSets: RetainedMediaSetResponse[];
}

export type RetainedMediaErrorCode = "http" | "invalid-response" | "invalid-asset";

export class RetainedMediaError extends Error {
    readonly code: RetainedMediaErrorCode;
    readonly status?: number;

    constructor(code: RetainedMediaErrorCode, message: string, status?: number) {
        super(message);
        this.name = "RetainedMediaError";
        this.code = code;
        this.status = status;
    }
}

function record(value: unknown, field: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw invalid(`${field} must be an object`);
    return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength = 2048): string {
    if (typeof value !== "string" || !value.trim() || value.length > maxLength)
        throw invalid(`${field} must be non-empty text`);
    return value;
}

function integer(value: unknown, field: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
    if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum)
        throw invalid(`${field} must be a safe integer between ${minimum} and ${maximum}`);
    return Number(value);
}

function finiteNumber(value: unknown, field: string): number {
    if (typeof value !== "number" || !Number.isFinite(value))
        throw invalid(`${field} must be finite`);
    return value;
}

function boolean(value: unknown, field: string): boolean {
    if (typeof value !== "boolean")
        throw invalid(`${field} must be true or false`);
    return value;
}

function instant(value: unknown, field: string): string {
    const result = text(value, field, 128);
    if (!Number.isFinite(Date.parse(result)))
        throw invalid(`${field} must be an ISO timestamp`);
    return result;
}

function nullableInstant(value: unknown, field: string): string | null {
    return value === null ? null : instant(value, field);
}

function enumeration<T extends string>(value: unknown, field: string, values: readonly T[]): T {
    if (typeof value !== "string" || !values.includes(value as T))
        throw invalid(`${field} has an unsupported value`);
    return value as T;
}

function sha256(value: unknown, field: string): string {
    const result = text(value, field, 64);
    if (!/^[0-9a-f]{64}$/.test(result))
        throw invalid(`${field} must be a lowercase SHA-256 digest`);
    return result;
}

function invalid(message: string): RetainedMediaError {
    return new RetainedMediaError("invalid-response", `Invalid retained-media response: ${message}`);
}

function bodyError(code: RetainedMediaErrorCode, message: string): RetainedMediaError {
    return code === "invalid-response" ? invalid(message) : new RetainedMediaError(code, message);
}

/** Reads a fetch body without ever buffering more than the caller's accepted contract. */
async function readBoundedResponseBody(
    response: Response,
    maximumBytes: number,
    code: RetainedMediaErrorCode,
    label: string,
): Promise<ArrayBuffer> {
    const contentLength = response.headers.get("Content-Length");
    if (contentLength !== null) {
        const normalized = contentLength.trim();
        if (!/^\d+$/.test(normalized) || !Number.isSafeInteger(Number(normalized)))
            throw bodyError(code, `${label} has an invalid Content-Length header.`);
        if (Number(normalized) > maximumBytes)
            throw bodyError(code, `${label} exceeds its transfer-size limit.`);
    }
    if (!response.body)
        throw bodyError(code, `${label} has no readable response body.`);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maximumBytes) {
                await reader.cancel().catch((): void => undefined);
                throw bodyError(code, `${label} exceeds its transfer-size limit.`);
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const buffer = new ArrayBuffer(total);
    const output = new Uint8Array(buffer);
    let offset = 0;
    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return buffer;
}

function normalizeConfiguredPath(path: string | undefined, fallback: string): string {
    const input = (path || fallback).replace(/\\/g, "/");
    const segments = input.split("/").filter(segment => segment && segment !== ".");
    if (segments.some(segment => segment === ".."))
        throw new RetainedMediaError("invalid-response", "The configured media endpoint is unsafe.");
    return `/${segments.map(segment => encodeURIComponent(segment)).join("/")}`;
}

function mediaEndpoint(node: RetainedMediaNode): string {
    const root = normalizeConfiguredPath(node.oshPathRoot, "/sensorhub");
    const buckets = normalizeConfiguredPath(node.bucketsEndpoint, "/buckets");
    const relative = `${root}${buckets}/videos`;
    if (node.isDefaultNode)
        return relative;
    const protocol = node.isSecure ? "https" : "http";
    return `${protocol}://${node.address}:${node.port}${relative}`;
}

function authenticationHeaders(node: RetainedMediaNode): Record<string, string> {
    const supplied = node.getBasicAuthHeader?.();
    const authorization = supplied && typeof supplied.Authorization === "string"
        ? supplied.Authorization : undefined;
    return authorization ? {Authorization: authorization} : {};
}

function parseEventScopedPath(
    path: unknown,
    eventId: string,
    field: string,
    filePattern: RegExp,
): {path: string; cameraToken: string; fileName: string} {
    const normalized = text(path, field, 1024).replace(/\\/g, "/");
    const parts = normalized.split("/");
    if (parts.length !== 4
        || parts[0] !== "media"
        || parts[1] !== eventId
        || !/^[A-Za-z0-9_-]{1,1024}$/.test(parts[2])
        || !filePattern.test(parts[3])) {
        throw invalid(`${field} is outside the event media whitelist`);
    }
    return {path: normalized, cameraToken: parts[2], fileName: parts[3]};
}

/** Builds a same-origin URL for the default node and a configured-node URL otherwise. */
export function buildRetainedMediaEventUrl(eventId: string, node: RetainedMediaNode): string {
    const normalized = text(eventId?.trim(), "eventId", 128);
    return `${mediaEndpoint(node)}/media/${encodeURIComponent(normalized)}`;
}

/**
 * Builds an asset URL only after constraining the server-provided path to the
 * event-scoped retained-media whitelist. Internal catalog object keys are
 * deliberately ignored.
 */
export function buildRetainedMediaAssetUrl(
    path: string,
    eventId: string,
    node: RetainedMediaNode,
): string {
    const validated = parseEventScopedPath(
        path,
        eventId,
        "asset.path",
        /^frame-0[1-5]\.jpg$/,
    );
    return `${mediaEndpoint(node)}/${validated.path.split("/").map(encodeURIComponent).join("/")}`;
}

function parseAsset(value: unknown, field: string): RetainedMediaAsset {
    const asset = record(value, field);
    const bytes = integer(asset.bytes, `${field}.bytes`, 1, MAX_RETAINED_FRAME_BYTES);
    const width = integer(asset.width, `${field}.width`, 1, MAX_RETAINED_FRAME_DIMENSION);
    const height = integer(asset.height, `${field}.height`, 1, MAX_RETAINED_FRAME_DIMENSION);
    if (width * height > MAX_RETAINED_FRAME_PIXELS)
        throw invalid(`${field} exceeds the decoded-pixel budget`);
    return {
        position: enumeration(asset.position, `${field}.position`, RETAINED_FRAME_POSITIONS),
        contentType: enumeration(asset.contentType, `${field}.contentType`, ["image/jpeg"] as const),
        sha256: sha256(asset.sha256, `${field}.sha256`),
        bytes,
        width,
        height,
        sourceFrameOrdinal: integer(asset.sourceFrameOrdinal, `${field}.sourceFrameOrdinal`),
        sourcePts: integer(asset.sourcePts, `${field}.sourcePts`, Number.MIN_SAFE_INTEGER),
        sourcePtsSeconds: finiteNumber(asset.sourcePtsSeconds, `${field}.sourcePtsSeconds`),
        state: enumeration(asset.state, `${field}.state`, ["PUBLISHED"] as const),
    };
}

function parseManifest(value: unknown, eventId: string, field: string): RetainedMediaManifest {
    const manifest = record(value, field);
    if (integer(manifest.schemaVersion, `${field}.schemaVersion`, 1, 1)
        !== RETAINED_MEDIA_SCHEMA_VERSION)
        throw invalid(`${field}.schemaVersion is unsupported`);
    if (text(manifest.eventId, `${field}.eventId`, 128) !== eventId)
        throw invalid(`${field}.eventId does not match the requested event`);
    const hold = record(manifest.hold, `${field}.hold`);
    const source = record(manifest.source, `${field}.source`);
    const rawAssets = manifest.assets;
    if (!Array.isArray(rawAssets) || rawAssets.length !== RETAINED_FRAME_COUNT)
        throw invalid(`${field}.assets must contain exactly five frames`);
    const assets = rawAssets.map((asset, index) => parseAsset(asset, `${field}.assets[${index}]`));
    if (new Set(assets.map(asset => asset.position)).size !== RETAINED_FRAME_COUNT
        || new Set(assets.map(asset => asset.sourceFrameOrdinal)).size !== RETAINED_FRAME_COUNT)
        throw invalid(`${field}.assets must contain five distinct positions and source frames`);

    const holdActive = boolean(hold.active, `${field}.hold.active`);
    return {
        schemaVersion: RETAINED_MEDIA_SCHEMA_VERSION,
        mediaSetId: text(manifest.mediaSetId, `${field}.mediaSetId`, 128),
        eventId,
        laneUid: text(manifest.laneUid, `${field}.laneUid`, 1024),
        cameraUid: text(manifest.cameraUid, `${field}.cameraUid`, 1024),
        createdAt: instant(manifest.createdAt, `${field}.createdAt`),
        jpegQuality: integer(manifest.jpegQuality, `${field}.jpegQuality`, 1, 100),
        lifecycleState: enumeration(manifest.lifecycleState, `${field}.lifecycleState`, ["AVAILABLE", "HELD"] as const),
        hold: {
            active: holdActive,
            reason: typeof hold.reason === "string" ? hold.reason.substring(0, 2048) : "",
            placedAt: holdActive
                ? instant(hold.placedAt, `${field}.hold.placedAt`)
                : nullableInstant(hold.placedAt ?? null, `${field}.hold.placedAt`),
        },
        source: {
            objectKey: text(source.objectKey, `${field}.source.objectKey`, 4096),
            sha256: sha256(source.sha256, `${field}.source.sha256`),
            bytes: integer(source.bytes, `${field}.source.bytes`, 1),
            codec: text(source.codec, `${field}.source.codec`, 128),
            durationMicros: integer(source.durationMicros, `${field}.source.durationMicros`),
            rollbackDeleteAfter: instant(source.rollbackDeleteAfter, `${field}.source.rollbackDeleteAfter`),
            state: enumeration(source.state, `${field}.source.state`, [
                "PRESERVED_FOR_ROLLBACK",
                "ELIGIBLE_FOR_DELETION",
                "DELETED",
            ] as const),
        },
        assets,
    };
}

function parseMediaSet(value: unknown, eventId: string, index: number): RetainedMediaSetResponse {
    const field = `mediaSets[${index}]`;
    const mediaSet = record(value, field);
    const manifest = parseManifest(mediaSet.manifest, eventId, `${field}.manifest`);
    const manifestPath = parseEventScopedPath(
        mediaSet.manifestPath,
        eventId,
        `${field}.manifestPath`,
        /^manifest\.json$/,
    );
    const responseAssets = mediaSet.assets;
    if (!Array.isArray(responseAssets) || responseAssets.length !== RETAINED_FRAME_COUNT)
        throw invalid(`${field}.assets must contain exactly five frames`);

    const byPosition = new Map(manifest.assets.map(asset => [asset.position, asset]));
    const assets = responseAssets.map((value, assetIndex) => {
        const assetResponse = record(value, `${field}.assets[${assetIndex}]`);
        const asset = parseAsset(assetResponse.asset, `${field}.assets[${assetIndex}].asset`);
        const canonical = byPosition.get(asset.position);
        if (!canonical || JSON.stringify(canonical) !== JSON.stringify(asset))
            throw invalid(`${field}.assets[${assetIndex}] does not match the manifest`);
        const assetPath = parseEventScopedPath(
            assetResponse.path,
            eventId,
            `${field}.assets[${assetIndex}].path`,
            /^frame-0[1-5]\.jpg$/,
        );
        if (assetPath.cameraToken !== manifestPath.cameraToken)
            throw invalid(`${field}.assets[${assetIndex}] uses the wrong camera path`);
        const expectedFileName = `frame-0${RETAINED_FRAME_POSITIONS.indexOf(asset.position) + 1}.jpg`;
        if (assetPath.fileName !== expectedFileName)
            throw invalid(`${field}.assets[${assetIndex}] uses the wrong frame filename`);
        return {asset, path: assetPath.path};
    }).sort((left, right) =>
        RETAINED_FRAME_POSITIONS.indexOf(left.asset.position)
        - RETAINED_FRAME_POSITIONS.indexOf(right.asset.position));

    if (new Set(assets.map(asset => asset.path)).size !== RETAINED_FRAME_COUNT)
        throw invalid(`${field}.assets contains duplicate paths`);

    return {
        manifest,
        manifestPath: manifestPath.path,
        assets,
    };
}

export function parseRetainedEventMedia(value: unknown, requestedEventId: string): RetainedEventMediaResponse {
    const payload = record(value, "response");
    if (integer(payload.schemaVersion, "response.schemaVersion", 1, 1)
        !== RETAINED_MEDIA_SCHEMA_VERSION)
        throw invalid("response.schemaVersion is unsupported");
    if (text(payload.eventId, "response.eventId", 128) !== requestedEventId)
        throw invalid("response.eventId does not match the requested event");
    if (!Array.isArray(payload.mediaSets)
        || payload.mediaSets.length < 1
        || payload.mediaSets.length > MAX_RETAINED_MEDIA_SETS)
        throw invalid(`response.mediaSets must contain 1-${MAX_RETAINED_MEDIA_SETS} entries`);
    const mediaSets = payload.mediaSets.map((entry, index) =>
        parseMediaSet(entry, requestedEventId, index));
    if (new Set(mediaSets.map(entry => entry.manifest.mediaSetId)).size !== mediaSets.length)
        throw invalid("response.mediaSets contains duplicate media-set IDs");
    const eventBytes = mediaSets.reduce((setTotal, mediaSet) =>
        setTotal + mediaSet.manifest.assets.reduce((total, asset) => total + asset.bytes, 0), 0);
    if (eventBytes > MAX_RETAINED_EVENT_BYTES)
        throw invalid(`response.mediaSets exceeds the ${MAX_RETAINED_EVENT_BYTES}-byte event budget`);
    const eventPixels = mediaSets.reduce((setTotal, mediaSet) =>
        setTotal + mediaSet.manifest.assets.reduce(
            (total, asset) => total + asset.width * asset.height, 0), 0);
    if (eventPixels > MAX_RETAINED_EVENT_PIXELS)
        throw invalid(`response.mediaSets exceeds the ${MAX_RETAINED_EVENT_PIXELS}-pixel event budget`);

    return {
        schemaVersion: RETAINED_MEDIA_SCHEMA_VERSION,
        eventId: requestedEventId,
        mediaSets,
    };
}

/**
 * Returns null only when the backend reports that this is a legacy event with
 * no retained-media manifest. Authentication, server, and schema failures stay
 * distinguishable so the UI can warn the operator before offering legacy video.
 */
export async function fetchRetainedEventMedia(
    eventId: string,
    node: RetainedMediaNode,
    fetchImpl: RetainedMediaFetch = fetch,
    signal?: AbortSignal,
): Promise<RetainedEventMediaResponse | null> {
    const normalizedEventId = text(eventId?.trim(), "eventId", 128);
    const response = await fetchImpl(buildRetainedMediaEventUrl(normalizedEventId, node), {
        credentials: "include",
        cache: "no-store",
        headers: {
            ...authenticationHeaders(node),
            Accept: "application/json",
        },
        signal,
    });
    if (response.status === 404)
        return null;
    if (!response.ok)
        throw new RetainedMediaError(
            "http",
            `Retained-media lookup returned HTTP ${response.status}`,
            response.status,
        );

    let payload: unknown;
    try {
        const body = await readBoundedResponseBody(
            response,
            MAX_RETAINED_CATALOG_BYTES,
            "invalid-response",
            "retained-media catalog",
        );
        payload = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(body));
    } catch (error) {
        if (error instanceof RetainedMediaError) throw error;
        throw invalid("response body is not bounded UTF-8 JSON");
    }
    return parseRetainedEventMedia(payload, normalizedEventId);
}

/** Loads one verified API asset into memory for an authenticated image element. */
export async function fetchRetainedMediaAsset(
    asset: RetainedMediaAssetResponse,
    eventId: string,
    node: RetainedMediaNode,
    fetchImpl: RetainedMediaFetch = fetch,
    signal?: AbortSignal,
): Promise<Blob> {
    const response = await fetchImpl(buildRetainedMediaAssetUrl(asset.path, eventId, node), {
        credentials: "include",
        cache: "default",
        headers: {
            ...authenticationHeaders(node),
            Accept: "image/jpeg",
        },
        signal,
    });
    if (!response.ok)
        throw new RetainedMediaError(
            "invalid-asset",
            `Retained frame returned HTTP ${response.status}`,
            response.status,
        );
    const contentType = response.headers.get("Content-Type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "image/jpeg")
        throw new RetainedMediaError("invalid-asset", "Retained frame is not a JPEG image.");
    const body = await readBoundedResponseBody(
        response,
        Math.min(asset.asset.bytes, MAX_RETAINED_FRAME_BYTES),
        "invalid-asset",
        "Retained frame",
    );
    if (body.byteLength !== asset.asset.bytes)
        throw new RetainedMediaError("invalid-asset", "Retained frame size does not match its manifest.");
    return new Blob([body], {type: "image/jpeg"});
}
