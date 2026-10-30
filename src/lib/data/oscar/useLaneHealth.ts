"use client";

import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";

import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import type {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    isConnectionDataStream,
    isGammaDataStream,
    isNeutronDataStream,
    isOccupancyStatusDataStream,
    isTamperDataStream,
    isVideoDataStream,
} from "@/lib/data/oscar/Utilities";

export type ConnectionState = "online" | "offline" | "unknown";
export type TelemetryState = "active" | "clear" | "unknown";
export type OccupancyState = "occupied" | "clear" | "unknown";
type StreamKind = "connection" | "gamma" | "neutron" | "tamper" | "occupancy";

export interface ComponentHealth {
    id: string;
    label: string;
    state: ConnectionState;
}

export interface FaultHealth {
    gammaHigh: TelemetryState;
    gammaLow: TelemetryState;
    neutronHigh: TelemetryState;
    tamper: TelemetryState;
}

export interface LaneHealth {
    laneName: string;
    nodeName: string;
    rpm: ComponentHealth;
    cameras: ComponentHealth[];
    faults: FaultHealth;
    occupancyState: OccupancyState;
    occupancyStartedAt: number | null;
    lastUpdatedAt: number | null;
}

export interface LaneHealthRow extends LaneHealth {
    occupancyDuration: number;
    extendedOccupancy: TelemetryState;
    hasFault: boolean;
    hasOfflineComponent: boolean;
    hasUnknownTelemetry: boolean;
}

export interface LaneHealthSummary {
    healthy: number;
    faulted: number;
    disconnected: number;
    unknown: number;
}

interface StreamBinding {
    key: string;
    kind: StreamKind;
    laneName: string;
    stream: any;
    parentNode: any;
    systemId: string;
    cameraSystemIds: Set<string>;
    lastAppliedTimestamp: number | null;
}

export const OCCUPANCY_THRESHOLD_KEY = "oscar.health.extendedOccupancyMinutes";
export const DEFAULT_OCCUPANCY_THRESHOLD_MINUTES = 1;
export const MAX_OCCUPANCY_THRESHOLD_MINUTES = 1440;
export const HEALTH_RECONCILIATION_INTERVAL_MS = 30_000;
// Keep latest-result probes small. PostgreSQL can answer a ten-stream indexed
// lookup comfortably even when the hot observation table contains millions of
// rows, while a fifty-stream request can exceed the browser deadline and leave
// every health chip in the indeterminate state. Global concurrency below still
// bounds database load while the batches are drained.
export const HEALTH_QUERY_BATCH_SIZE = 10;
export const HEALTH_QUERY_CONCURRENCY = 2;
export const HEALTH_QUERY_TIMEOUT_MS = 10_000;

type FaultKey = keyof FaultHealth;
const FAULT_KEYS: FaultKey[] = ["gammaHigh", "gammaLow", "neutronHigh", "tamper"];
const GAMMA_STATES = new Set(["Alarm", "Background", "Scan", "Fault - Gamma High", "Fault - Gamma Low"]);
const NEUTRON_STATES = new Set(["Alarm", "Background", "Scan", "Fault - Neutron High", "Fault - Neutron Low"]);

function chunk<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < values.length; index += size)
        chunks.push(values.slice(index, index + size));
    return chunks;
}

async function fetchHealthQueryPage(query: any, signal: AbortSignal): Promise<any[]> {
    // The pinned osh-js Collection does not yet expose AbortSignal. Its public
    // query metadata and parser let this bounded health request use the same
    // URL/decoding while still cancelling the underlying browser fetch.
    if (typeof query?.url === "string"
        && typeof query?.filter?.toQueryString === "function"
        && typeof query?.parseResponse === "function") {
        const queryString = `${query.filter.toQueryString()}&offset=0&limit=${query.pageSize}`;
        const response = await fetch(`${query.url}?${queryString}`, {
            method: "GET",
            credentials: "include",
            headers: query.headers ?? {},
            signal,
        });
        if (!response.ok)
            throw new Error(`Got ${response.status} response from ${query.url}`);
        const payload = query.responseFormat === "arraybuffer"
            ? await response.arrayBuffer()
            : await response.json();
        return await query.parseResponse(payload);
    }

    // Test doubles and future compatible wrappers can continue to provide the
    // normal nextPage API. The outer deadline still ignores a late result.
    return query.nextPage();
}

async function withHealthQueryTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    activeControllers?: Set<AbortController>,
): Promise<T> {
    const controller = new AbortController();
    activeControllers?.add(controller);
    let timeout: number | null = null;
    const deadline = new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => {
            controller.abort();
            reject(new Error(`Health snapshot timed out after ${HEALTH_QUERY_TIMEOUT_MS} ms`));
        }, HEALTH_QUERY_TIMEOUT_MS);
    });

    try {
        return await Promise.race([
            Promise.resolve().then(() => operation(controller.signal)),
            deadline,
        ]);
    } finally {
        if (timeout != null) window.clearTimeout(timeout);
        activeControllers?.delete(controller);
    }
}

const faultDefaults = (): FaultHealth => ({
    gammaHigh: "unknown",
    gammaLow: "unknown",
    neutronHigh: "unknown",
    tamper: "unknown",
});

function systemId(system: any): string {
    return system?.properties?.id ?? "";
}

function systemUid(system: any): string {
    return system?.properties?.properties?.uid ?? system?.properties?.uid ?? "";
}

function systemName(system: any): string {
    const name = system?.properties?.properties?.name ?? system?.properties?.name;
    if (typeof name === "string" && name.trim().length > 0)
        return name;

    const uid = systemUid(system);
    return uid ? uid.split(":").pop() ?? "" : "";
}

function streamSystemId(stream: any): string {
    return stream?.properties?.["system@id"] ?? "";
}

function streamLabel(stream: any): string {
    return stream?.properties?.name ?? stream?.properties?.outputName ?? "Camera";
}

function isCameraSystem(system: any): boolean {
    const uid = systemUid(system).toLowerCase();
    const name = systemName(system).toLowerCase();
    return uid.includes(":ffmpeg:") || name.includes("camera");
}

function getConnectionState(result: any): ConnectionState {
    const state = result?.isConnected ?? result?.connection;
    return typeof state === "boolean" ? (state ? "online" : "offline") : "unknown";
}

function timestampToMilliseconds(value: unknown): number | null {
    if (typeof value === "number") {
        const timestamp = value * (value < 1_000_000_000_000 ? 1000 : 1);
        return Number.isFinite(timestamp) ? timestamp : null;
    }
    if (typeof value !== "string" || value.trim().length === 0)
        return null;

    const numeric = Number(value);
    const timestamp = Number.isFinite(numeric)
        ? numeric * (numeric < 1_000_000_000_000 ? 1000 : 1)
        : Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function observationTimestamp(observation: any): number | null {
    return timestampToMilliseconds(
        observation?.resultTime ?? observation?.phenomenonTime ??
        observation?.properties?.resultTime ?? observation?.properties?.phenomenonTime ??
        observation?.result?.samplingTime ?? observation?.values?.[0]?.data?.samplingTime
    );
}

function streamKind(stream: any): StreamKind | null {
    if (isConnectionDataStream(stream)) return "connection";
    if (isOccupancyStatusDataStream(stream)) return "occupancy";
    if (isTamperDataStream(stream)) return "tamper";
    if (isGammaDataStream(stream)) return "gamma";
    if (isNeutronDataStream(stream)) return "neutron";
    return null;
}

function buildLaneHealth(laneName: string, lane: LaneMapEntry): LaneHealth {
    const cameraSystems = new Map<string, ComponentHealth>();

    lane.systems.forEach((system: any) => {
        if (!isCameraSystem(system)) return;
        const id = systemId(system);
        if (!id) return;
        cameraSystems.set(id, {id, label: systemName(system) || "Camera", state: "unknown"});
    });
    lane.datastreams.forEach((stream: any) => {
        if (!isVideoDataStream(stream)) return;
        const id = streamSystemId(stream) || stream?.properties?.id;
        if (!id || cameraSystems.has(id)) return;
        const system = lane.systems.find((candidate: any) => systemId(candidate) === id);
        cameraSystems.set(id, {id, label: systemName(system) || streamLabel(stream), state: "unknown"});
    });

    const cameraSystemIds = new Set(cameraSystems.keys());
    const rpmStream = lane.datastreams.find((stream: any) =>
        !cameraSystemIds.has(streamSystemId(stream)) &&
        (isConnectionDataStream(stream) || isGammaDataStream(stream) ||
            isNeutronDataStream(stream) || isTamperDataStream(stream))
    );
    const rpmSystem = lane.systems.find((system: any) => systemId(system) === streamSystemId(rpmStream));

    return {
        laneName,
        nodeName: lane.parentNode?.name ?? "",
        rpm: {
            id: systemId(rpmSystem) || streamSystemId(rpmStream) || `${laneName}-rpm`,
            label: systemName(rpmSystem) || "RPM",
            state: "unknown",
        },
        cameras: Array.from(cameraSystems.values())
            .sort((a, b) => a.label.localeCompare(b.label, undefined, {numeric: true})),
        faults: faultDefaults(),
        occupancyState: "unknown",
        occupancyStartedAt: null,
        lastUpdatedAt: null,
    };
}

export function formatHealthDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function deriveLaneHealthRows(
    lanes: LaneHealth[],
    now: number,
    thresholdMinutes: number,
): LaneHealthRow[] {
    const thresholdMilliseconds = thresholdMinutes * 60 * 1000;
    return lanes.map((lane) => {
        const occupancyDuration = lane.occupancyStartedAt == null ? 0 : Math.max(0, now - lane.occupancyStartedAt);
        const extendedOccupancy: TelemetryState = lane.occupancyState === "unknown"
            ? "unknown"
            : lane.occupancyState === "clear"
                ? "clear"
                : lane.occupancyStartedAt == null
                    ? "unknown"
                    : occupancyDuration > thresholdMilliseconds ? "active" : "clear";
        const hasFault = Object.values(lane.faults).includes("active") || extendedOccupancy === "active";
        const hasOfflineComponent = lane.rpm.state === "offline" || lane.cameras.some((camera) => camera.state === "offline");
        const hasUnknownTelemetry = lane.rpm.state === "unknown"
            || lane.cameras.some((camera) => camera.state === "unknown")
            || Object.values(lane.faults).includes("unknown")
            || extendedOccupancy === "unknown";
        return {...lane, occupancyDuration, extendedOccupancy, hasFault, hasOfflineComponent, hasUnknownTelemetry};
    });
}

export function summarizeLaneHealth(laneRows: LaneHealthRow[]): LaneHealthSummary {
    return {
        healthy: laneRows.filter((lane) => !lane.hasFault && !lane.hasOfflineComponent && !lane.hasUnknownTelemetry).length,
        faulted: laneRows.filter((lane) => lane.hasFault).length,
        disconnected: laneRows.filter((lane) => lane.hasOfflineComponent).length,
        unknown: laneRows.filter((lane) => lane.hasUnknownTelemetry).length,
    };
}

export function nextExtendedOccupancyDeadline(
    lanes: LaneHealth[],
    thresholdMinutes: number,
    now: number,
): number | null {
    const thresholdMilliseconds = thresholdMinutes * 60 * 1000;
    return lanes.reduce<number | null>((earliest, lane) => {
        if (lane.occupancyState !== "occupied" || lane.occupancyStartedAt == null)
            return earliest;
        const deadline = lane.occupancyStartedAt + thresholdMilliseconds + 1;
        if (deadline <= now)
            return earliest;
        return earliest == null ? deadline : Math.min(earliest, deadline);
    }, null);
}

export function useLaneHealthClock(lanes: LaneHealth[], thresholdMinutes: number): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let timer: number | null = null;
        const scheduleNextDeadline = () => {
            const current = Date.now();
            setNow(current);
            const nextDeadline = nextExtendedOccupancyDeadline(lanes, thresholdMinutes, current);
            if (nextDeadline != null) {
                timer = window.setTimeout(
                    scheduleNextDeadline,
                    Math.max(0, nextDeadline - Date.now()),
                );
            }
        };

        scheduleNextDeadline();
        return () => {
            if (timer != null) window.clearTimeout(timer);
        };
    }, [lanes, thresholdMinutes]);

    return now;
}

export function useLaneHealth() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const {laneMapRef, laneMapReady} = useContext(DataSourceContext);
    const [lanes, setLanes] = useState<LaneHealth[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [thresholdMinutes, setThresholdMinutesState] = useState(DEFAULT_OCCUPANCY_THRESHOLD_MINUTES);
    const reconcileLatestRef = useRef<() => Promise<void>>(() => Promise.resolve());

    useEffect(() => {
        const saved = Number(window.localStorage.getItem(OCCUPANCY_THRESHOLD_KEY));
        if (Number.isFinite(saved) && saved >= 1 && saved <= MAX_OCCUPANCY_THRESHOLD_MINUTES)
            setThresholdMinutesState(saved);
    }, []);

    const setThresholdMinutes = useCallback((value: number) => {
        const next = Math.min(MAX_OCCUPANCY_THRESHOLD_MINUTES, Math.max(1, value || 1));
        setThresholdMinutesState(next);
        window.localStorage.setItem(OCCUPANCY_THRESHOLD_KEY, String(next));
    }, []);

    const refreshLaneHealth = useCallback(
        () => reconcileLatestRef.current(),
        [],
    );

    useEffect(() => {
        if (!laneMapReady) {
            setLanes([]);
            setIsLoading(true);
            return;
        }

        let active = true;
        let reconciliationTimer: number | null = null;
        let reconciliationPromise: Promise<void> | null = null;
        let queuedRefreshPromise: Promise<void> | null = null;
        const healthRequestControllers = new Set<AbortController>();
        const currentLaneMap = laneMapRef.current;
        const sortedEntries = Array.from(currentLaneMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"}));
        const initialLanes = sortedEntries.map(([laneName, lane]) => buildLaneHealth(laneName, lane));
        const bindings: StreamBinding[] = [];
        const faultSamples = new Map<string, Map<FaultKey, Map<string, TelemetryState>>>();

        setLanes(initialLanes);
        setIsLoading(!laneMapReady);

        const updateLane = (laneName: string, updater: (lane: LaneHealth) => LaneHealth) => {
            if (!active) return;
            setLanes((current) => {
                let changed = false;
                const next = current.map((lane) => {
                    if (lane.laneName !== laneName) return lane;
                    const updated = updater(lane);
                    changed ||= updated !== lane;
                    return updated;
                });
                return changed ? next : current;
            });
        };

        const sampleMap = (laneName: string, fault: FaultKey) => {
            let laneSamples = faultSamples.get(laneName);
            if (!laneSamples) {
                laneSamples = new Map();
                faultSamples.set(laneName, laneSamples);
            }
            let samples = laneSamples.get(fault);
            if (!samples) {
                samples = new Map();
                laneSamples.set(fault, samples);
            }
            return samples;
        };

        const aggregateFault = (laneName: string, fault: FaultKey): TelemetryState => {
            const samples = faultSamples.get(laneName)?.get(fault);
            if (!samples || samples.size === 0) return "unknown";
            const values = Array.from(samples.values());
            if (values.includes("active")) return "active";
            return values.includes("unknown") ? "unknown" : "clear";
        };

        const registerFaultBinding = (binding: StreamBinding) => {
            const faults: FaultKey[] = binding.kind === "gamma"
                ? ["gammaHigh", "gammaLow"]
                : binding.kind === "neutron"
                    ? ["neutronHigh"]
                    : binding.kind === "tamper"
                        ? ["tamper"]
                        : [];
            faults.forEach((fault) => sampleMap(binding.laneName, fault).set(binding.key, "unknown"));
        };

        const applyFaultSamples = (binding: StreamBinding, samples: Partial<FaultHealth>, updatedAt: number): boolean => {
            if (!active) return false;
            const entries = Object.entries(samples) as Array<[FaultKey, TelemetryState]>;
            if (entries.length === 0) return false;
            entries.forEach(([fault, state]) => sampleMap(binding.laneName, fault).set(binding.key, state));
            updateLane(binding.laneName, (lane) => ({
                ...lane,
                faults: FAULT_KEYS.reduce((result, fault) => ({
                    ...result,
                    [fault]: aggregateFault(binding.laneName, fault),
                }), {} as FaultHealth),
                lastUpdatedAt: Math.max(lane.lastUpdatedAt ?? 0, updatedAt),
            }));
            return true;
        };

        const applyAlarmState = (binding: StreamBinding, state: unknown, updatedAt: number): boolean => {
            if (typeof state !== "string") return false;
            if (binding.kind === "gamma") {
                if (!GAMMA_STATES.has(state)) return false;
                return applyFaultSamples(binding, {
                    gammaHigh: state === "Fault - Gamma High" ? "active" : "clear",
                    gammaLow: state === "Fault - Gamma Low" ? "active" : "clear",
                }, updatedAt);
            }
            if (binding.kind === "neutron") {
                if (!NEUTRON_STATES.has(state)) return false;
                return applyFaultSamples(binding, {
                    neutronHigh: state === "Fault - Neutron High" ? "active" : "clear",
                }, updatedAt);
            }
            return false;
        };

        const applyTamperState = (binding: StreamBinding, state: unknown, updatedAt: number): boolean => {
            if (typeof state !== "boolean") return false;
            return applyFaultSamples(binding, {tamper: state ? "active" : "clear"}, updatedAt);
        };

        const applyConnectionState = (binding: StreamBinding, result: any, updatedAt: number): boolean => {
            const state = getConnectionState(result);
            if (state === "unknown" || !active) return false;
            updateLane(binding.laneName, (lane) => {
                if (binding.cameraSystemIds.has(binding.systemId)) {
                    return {
                        ...lane,
                        cameras: lane.cameras.map((camera) => camera.id === binding.systemId ? {...camera, state} : camera),
                        lastUpdatedAt: Math.max(lane.lastUpdatedAt ?? 0, updatedAt),
                    };
                }
                return {
                    ...lane,
                    rpm: {...lane.rpm, state},
                    lastUpdatedAt: Math.max(lane.lastUpdatedAt ?? 0, updatedAt),
                };
            });
            return true;
        };

        const applyOccupancyState = (binding: StreamBinding, result: any, updatedAt: number): boolean => {
            if (typeof result?.isOccupied !== "boolean" || !active) return false;
            const occupancyStartedAt = result.isOccupied
                ? timestampToMilliseconds(result.occupancyStartTime)
                : null;
            updateLane(binding.laneName, (lane) => ({
                ...lane,
                occupancyState: result.isOccupied ? "occupied" : "clear",
                occupancyStartedAt: result.isOccupied
                    ? occupancyStartedAt ?? (lane.occupancyState === "occupied" ? lane.occupancyStartedAt : null)
                    : null,
                lastUpdatedAt: Math.max(lane.lastUpdatedAt ?? 0, updatedAt),
            }));
            return true;
        };

        const applyBindingResult = (binding: StreamBinding, result: any, updatedAt: number): boolean => {
            switch (binding.kind) {
                case "connection": return applyConnectionState(binding, result, updatedAt);
                case "tamper": return applyTamperState(binding, result?.tamperStatus, updatedAt);
                case "gamma":
                case "neutron": return applyAlarmState(binding, result?.alarmState, updatedAt);
                case "occupancy": return applyOccupancyState(binding, result, updatedAt);
            }
        };

        const applyFreshBindingResult = (binding: StreamBinding, result: any, updatedAt: number): boolean => {
            if (!active) return false;
            if (binding.lastAppliedTimestamp != null && updatedAt < binding.lastAppliedTimestamp)
                return false;

            const applied = applyBindingResult(binding, result, updatedAt);
            if (!applied) return false;

            binding.lastAppliedTimestamp = binding.lastAppliedTimestamp == null
                ? updatedAt
                : Math.max(binding.lastAppliedTimestamp, updatedAt);
            return true;
        };

        const markBindingUnknown = (binding: StreamBinding) => {
            if (binding.kind === "connection") {
                updateLane(binding.laneName, (lane) => {
                    if (binding.cameraSystemIds.has(binding.systemId)) {
                        const camera = lane.cameras.find((candidate) => candidate.id === binding.systemId);
                        if (!camera || camera.state === "unknown") return lane;
                        return {
                            ...lane,
                            cameras: lane.cameras.map((candidate) =>
                                candidate.id === binding.systemId ? {...candidate, state: "unknown"} : candidate),
                        };
                    }
                    return lane.rpm.state === "unknown"
                        ? lane
                        : {...lane, rpm: {...lane.rpm, state: "unknown"}};
                });
                return;
            }

            if (binding.kind === "occupancy") {
                updateLane(binding.laneName, (lane) =>
                    lane.occupancyState === "unknown" && lane.occupancyStartedAt == null
                        ? lane
                        : {...lane, occupancyState: "unknown", occupancyStartedAt: null});
                return;
            }

            const faults: FaultKey[] = binding.kind === "gamma"
                ? ["gammaHigh", "gammaLow"]
                : binding.kind === "neutron"
                    ? ["neutronHigh"]
                    : ["tamper"];
            faults.forEach((fault) => sampleMap(binding.laneName, fault).set(binding.key, "unknown"));
            updateLane(binding.laneName, (lane) => {
                const nextFaults = FAULT_KEYS.reduce((result, fault) => ({
                    ...result,
                    [fault]: aggregateFault(binding.laneName, fault),
                }), {} as FaultHealth);
                return FAULT_KEYS.every((fault) => lane.faults[fault] === nextFaults[fault])
                    ? lane
                    : {...lane, faults: nextFaults};
            });
        };

        sortedEntries.forEach(([laneName, lane]) => {
            const cameraSystemIds = new Set(buildLaneHealth(laneName, lane).cameras.map((camera) => camera.id));
            lane.datastreams.forEach((stream: any, index: number) => {
                const kind = streamKind(stream);
                if (!kind) return;
                const binding: StreamBinding = {
                    key: stream?.properties?.id ?? `${laneName}-${index}`,
                    kind,
                    laneName,
                    stream,
                    parentNode: lane.parentNode,
                    systemId: streamSystemId(stream),
                    cameraSystemIds,
                    lastAppliedTimestamp: null,
                };
                bindings.push(binding);
                registerFaultBinding(binding);
            });
        });

        const bindingsByNode = new Map<any, Map<string, StreamBinding[]>>();
        bindings.forEach((binding) => {
            const streamId = binding.stream?.properties?.id;
            if (!streamId) return;
            let bindingsByStream = bindingsByNode.get(binding.parentNode);
            if (!bindingsByStream) {
                bindingsByStream = new Map();
                bindingsByNode.set(binding.parentNode, bindingsByStream);
            }
            const streamBindings = bindingsByStream.get(streamId) ?? [];
            streamBindings.push(binding);
            bindingsByStream.set(streamId, streamBindings);
        });

        const fetchLatestBatch = async (
            parentNode: any,
            bindingsByStream: Map<string, StreamBinding[]>,
            streamIds: string[],
            batchNumber: number,
        ) => {
            try {
                const observations = await withHealthQueryTimeout(async (signal) => {
                    const query = await parentNode.getObservationsApi().searchObservations(
                        new ObservationFilter({
                            resultTime: "latest",
                            dataStream: streamIds.join(","),
                        }),
                        streamIds.length,
                    );
                    return fetchHealthQueryPage(query, signal);
                }, healthRequestControllers);
                if (!active) return;
                const appliedBindings = new Set<StreamBinding>();
                const staleBindings = new Set<StreamBinding>();
                observations?.forEach((observation: any) => {
                    const streamId = observation?.properties?.["datastream@id"];
                    if (typeof streamId !== "string") return;
                    bindingsByStream.get(streamId)?.forEach((binding) => {
                        const updatedAt = observationTimestamp(observation) ?? Date.now();
                        if (binding.lastAppliedTimestamp != null && updatedAt < binding.lastAppliedTimestamp) {
                            staleBindings.add(binding);
                            return;
                        }
                        const applied = applyFreshBindingResult(
                            binding,
                            observation?.properties?.result,
                            updatedAt,
                        );
                        if (applied) appliedBindings.add(binding);
                    });
                });
                bindingsByStream.forEach((streamBindings) => streamBindings.forEach((binding) => {
                    if (!appliedBindings.has(binding) && !staleBindings.has(binding))
                        markBindingUnknown(binding);
                }));
            } catch (error) {
                if (!active) return;
                bindingsByStream.forEach((streamBindings) =>
                    streamBindings.forEach((binding) => markBindingUnknown(binding)));
                console.warn(
                    `Unable to fetch latest health status for ${parentNode?.name ?? "node"} (batch ${batchNumber})`,
                    error,
                );
            }
        };

        const reconcileLatest = (): Promise<void> => {
            if (reconciliationPromise)
                return reconciliationPromise;

            const queues = Array.from(bindingsByNode.entries()).map(([parentNode, bindingsByStream]) => ({
                parentNode,
                bindingsByStream,
                batches: chunk(Array.from(bindingsByStream.keys()), HEALTH_QUERY_BATCH_SIZE),
            }));
            const tasks: Array<{
                parentNode: any;
                bindingsByStream: Map<string, StreamBinding[]>;
                streamIds: string[];
                batchNumber: number;
            }> = [];
            const batchCount = Math.max(0, ...queues.map((queue) => queue.batches.length));
            for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
                queues.forEach(({parentNode, bindingsByStream, batches}) => {
                    const streamIds = batches[batchIndex];
                    if (!streamIds) return;
                    tasks.push({
                        parentNode,
                        bindingsByStream: new Map(streamIds.map((streamId) => [
                            streamId,
                            bindingsByStream.get(streamId) ?? [],
                        ])),
                        streamIds,
                        batchNumber: batchIndex + 1,
                    });
                });
            }
            let nextTask = 0;
            const workers = Array.from(
                {length: Math.min(HEALTH_QUERY_CONCURRENCY, tasks.length)},
                async () => {
                    while (active) {
                        const task = tasks[nextTask++];
                        if (!task) return;
                        await fetchLatestBatch(
                            task.parentNode,
                            task.bindingsByStream,
                            task.streamIds,
                            task.batchNumber,
                        );
                    }
                },
            );
            const run = Promise.allSettled(workers).then((): void => {});
            reconciliationPromise = run;
            void run.finally(() => {
                if (reconciliationPromise === run)
                    reconciliationPromise = null;
            });
            return run;
        };

        const requestFreshReconciliation = (): Promise<void> => {
            const inFlight = reconciliationPromise;
            if (!inFlight)
                return reconcileLatest();
            if (queuedRefreshPromise)
                return queuedRefreshPromise;

            let queued: Promise<void>;
            queued = inFlight.then(async () => {
                if (!active) return;
                if (reconciliationPromise === inFlight)
                    reconciliationPromise = null;
                await reconcileLatest();
            }).finally(() => {
                if (queuedRefreshPromise === queued)
                    queuedRefreshPromise = null;
            });
            queuedRefreshPromise = queued;
            return queued;
        };
        reconcileLatestRef.current = requestFreshReconciliation;

        const initialize = async () => {
            if (bindings.length > 0) {
                reconciliationTimer = window.setInterval(() => {
                    void reconcileLatest();
                }, HEALTH_RECONCILIATION_INTERVAL_MS);
            }

            await reconcileLatest();
            if (active && laneMapReady) setIsLoading(false);
        };

        void initialize();
        return () => {
            active = false;
            healthRequestControllers.forEach((controller) => controller.abort());
            healthRequestControllers.clear();
            if (reconcileLatestRef.current === requestFreshReconciliation)
                reconcileLatestRef.current = () => Promise.resolve();
            if (reconciliationTimer != null)
                window.clearInterval(reconciliationTimer);
        };
    }, [laneMap, laneMapReady, laneMapRef]);

    return useMemo(() => ({
        lanes,
        isLoading,
        thresholdMinutes,
        setThresholdMinutes,
        refreshLaneHealth,
    }), [lanes, isLoading, thresholdMinutes, setThresholdMinutes, refreshLaneHealth]);
}
