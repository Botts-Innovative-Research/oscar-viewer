"use client";

import React, {useContext, useEffect, useMemo, useState} from "react";
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    InputAdornment,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    CheckCircleRounded,
    ErrorRounded,
    MonitorHeartRounded,
    RadioButtonUncheckedRounded,
    VideocamRounded,
} from "@mui/icons-material";
import {useSelector} from "react-redux";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    isConnectionDataStream,
    isGammaDataStream,
    isNeutronDataStream,
    isOccupancyStatusDataStream,
    isTamperDataStream,
    isVideoDataStream,
} from "@/lib/data/oscar/Utilities";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {EventType} from "osh-js/source/core/event/EventType";

type ConnectionState = "online" | "offline" | "unknown";
type TelemetryState = "active" | "clear" | "unknown";
type OccupancyState = "occupied" | "clear" | "unknown";
type StreamKind = "connection" | "gamma" | "neutron" | "tamper" | "occupancy";
type FaultKey = keyof FaultHealth;

interface ComponentHealth {
    id: string;
    label: string;
    state: ConnectionState;
}

interface FaultHealth {
    gammaHigh: TelemetryState;
    gammaLow: TelemetryState;
    neutronHigh: TelemetryState;
    tamper: TelemetryState;
}

interface LaneHealth {
    laneName: string;
    nodeName: string;
    rpm: ComponentHealth;
    cameras: ComponentHealth[];
    faults: FaultHealth;
    occupancyState: OccupancyState;
    occupancyStartedAt: number | null;
    lastUpdatedAt: number | null;
}

interface StreamBinding {
    key: string;
    kind: StreamKind;
    laneName: string;
    stream: any;
    datasource: any;
    systemId: string;
    cameraSystemIds: Set<string>;
    liveGeneration: number;
    lastAppliedTimestamp: number | null;
    cleanup?: () => void;
}

const OCCUPANCY_THRESHOLD_KEY = "oscar.health.extendedOccupancyMinutes";
const DEFAULT_OCCUPANCY_THRESHOLD_MINUTES = 1;
const MAX_OCCUPANCY_THRESHOLD_MINUTES = 1440;
const HEALTH_RECONCILIATION_INTERVAL_MS = 30_000;
const FAULT_KEYS: FaultKey[] = ["gammaHigh", "gammaLow", "neutronHigh", "tamper"];
const GAMMA_STATES = new Set(["Alarm", "Background", "Scan", "Fault - Gamma High", "Fault - Gamma Low"]);
const NEUTRON_STATES = new Set(["Alarm", "Background", "Scan", "Fault - Neutron High", "Fault - Neutron Low"]);

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

function getMessageResult(message: any): any {
    return message?.values?.[0]?.data ?? message?.data ?? message?.result;
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

function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function streamKind(stream: any): StreamKind | null {
    if (isConnectionDataStream(stream)) return "connection";
    if (isOccupancyStatusDataStream(stream)) return "occupancy";
    if (isTamperDataStream(stream)) return "tamper";
    if (isGammaDataStream(stream)) return "gamma";
    if (isNeutronDataStream(stream)) return "neutron";
    return null;
}

function findRealtimeDatasource(lane: LaneMapEntry, stream: any): any {
    const streamId = stream?.properties?.id;
    return lane.datasourcesRealtime?.find((datasource: any) =>
        datasource?.properties?.resource?.split("/")?.[2] === streamId
    );
}

function subscribeWithCleanup(datasource: any, handler: (message: any) => void): () => void {
    datasource.subscribe(handler, [EventType.DATA]);
    return () => {
        const listeners = datasource.eventSubscriptionMap?.[EventType.DATA];
        if (!Array.isArray(listeners)) return;
        let index = listeners.indexOf(handler);
        while (index >= 0) {
            listeners.splice(index, 1);
            index = listeners.indexOf(handler);
        }
    };
}

function StatusIndicator({component, labels}: {
    component: ComponentHealth;
    labels: Record<ConnectionState, string>;
}) {
    const color = component.state === "online" ? "success.main" : component.state === "offline" ? "error.main" : "text.disabled";
    const text = labels[component.state];

    return (
        <Tooltip title={`${component.label}: ${text}`}>
            <Chip
                size="small"
                variant="outlined"
                icon={<Box component="span" sx={{width: 9, height: 9, borderRadius: "50%", bgcolor: color}}/>}
                label={`${component.label} · ${text}`}
                sx={{
                    borderColor: component.state === "unknown" ? "divider" : color,
                    "& .MuiChip-icon": {ml: 1},
                }}
            />
        </Tooltip>
    );
}

function FaultIndicator({label, state, faultText, clearText, unknownText}: {
    label: string;
    state: TelemetryState;
    faultText: string;
    clearText: string;
    unknownText: string;
}) {
    const active = state === "active";
    const unknown = state === "unknown";
    return (
        <Chip
            size="small"
            color={active ? "error" : "default"}
            variant={active ? "filled" : "outlined"}
            icon={active ? <ErrorRounded/> : unknown ? <RadioButtonUncheckedRounded/> : <CheckCircleRounded/>}
            label={`${label}: ${active ? faultText : unknown ? unknownText : clearText}`}
            sx={{fontWeight: active ? 700 : 400, opacity: unknown ? 0.72 : 1}}
        />
    );
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

export default function HealthPage() {
    const {t} = useLanguage();
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const {laneMapRef, laneMapReady} = useContext(DataSourceContext);
    const [lanes, setLanes] = useState<LaneHealth[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [thresholdMinutes, setThresholdMinutes] = useState(DEFAULT_OCCUPANCY_THRESHOLD_MINUTES);

    useEffect(() => {
        const saved = Number(window.localStorage.getItem(OCCUPANCY_THRESHOLD_KEY));
        if (Number.isFinite(saved) && saved >= 1 && saved <= MAX_OCCUPANCY_THRESHOLD_MINUTES)
            setThresholdMinutes(saved);
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let active = true;
        let reconciliationTimer: number | null = null;
        let reconciliationPromise: Promise<void> | null = null;
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
            setLanes((current) => current.map((lane) => lane.laneName === laneName ? updater(lane) : lane));
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

        const applyFreshBindingResult = (
            binding: StreamBinding,
            result: any,
            updatedAt: number,
            source: "live" | "snapshot",
            expectedLiveGeneration?: number,
        ): boolean => {
            if (!active) return false;
            if (expectedLiveGeneration != null && binding.liveGeneration !== expectedLiveGeneration)
                return false;
            if (binding.lastAppliedTimestamp != null && updatedAt < binding.lastAppliedTimestamp)
                return false;

            const applied = applyBindingResult(binding, result, updatedAt);
            if (!applied) return false;

            binding.lastAppliedTimestamp = binding.lastAppliedTimestamp == null
                ? updatedAt
                : Math.max(binding.lastAppliedTimestamp, updatedAt);
            if (source === "live")
                binding.liveGeneration++;
            return true;
        };

        sortedEntries.forEach(([laneName, lane]) => {
            const cameraSystemIds = new Set(buildLaneHealth(laneName, lane).cameras.map((camera) => camera.id));
            lane.datastreams.forEach((stream: any, index: number) => {
                const kind = streamKind(stream);
                if (!kind) return;
                const datasource = findRealtimeDatasource(lane, stream);
                if (!datasource) return;
                const binding: StreamBinding = {
                    key: stream?.properties?.id ?? `${laneName}-${index}`,
                    kind,
                    laneName,
                    stream,
                    datasource,
                    systemId: streamSystemId(stream),
                    cameraSystemIds,
                    liveGeneration: 0,
                    lastAppliedTimestamp: null,
                };
                bindings.push(binding);
                registerFaultBinding(binding);
            });
        });

        const fetchLatest = async (binding: StreamBinding) => {
            const expectedLiveGeneration = binding.liveGeneration;
            try {
                const query = await binding.stream.searchObservations(
                    new ObservationFilter({resultTime: "latest"}), 1
                );
                const observations = await query.nextPage();
                if (!active || binding.liveGeneration !== expectedLiveGeneration) return;
                const observation = observations?.[0];
                applyFreshBindingResult(
                    binding,
                    observation?.result,
                    observationTimestamp(observation) ?? Date.now(),
                    "snapshot",
                    expectedLiveGeneration,
                );
            } catch (error) {
                console.warn(`Unable to fetch latest health status for ${binding.laneName}`, error);
            }
        };

        const reconcileLatest = (): Promise<void> => {
            if (reconciliationPromise)
                return reconciliationPromise;

            const run = Promise.allSettled(bindings.map(fetchLatest)).then((): void => {});
            reconciliationPromise = run;
            void run.finally(() => {
                if (reconciliationPromise === run)
                    reconciliationPromise = null;
            });
            return run;
        };

        const initializeAndSubscribe = async () => {
            const connectionPromises: Promise<void>[] = [];
            bindings.forEach((binding) => {
                const handleMessage = (message: any) => {
                    if (!active) return;
                    applyFreshBindingResult(
                        binding,
                        getMessageResult(message),
                        observationTimestamp(message) ?? Date.now(),
                        "live",
                    );
                };
                try {
                    binding.cleanup = subscribeWithCleanup(binding.datasource, handleMessage);
                    connectionPromises.push(
                        Promise.resolve(binding.datasource.connect())
                            .then((): void => {})
                            .catch((error) => {
                                console.warn(`Unable to subscribe to health status for ${binding.laneName}`, error);
                            })
                    );
                } catch (error) {
                    console.warn(`Unable to subscribe to health status for ${binding.laneName}`, error);
                }
            });

            if (bindings.length > 0) {
                reconciliationTimer = window.setInterval(() => {
                    void reconcileLatest();
                }, HEALTH_RECONCILIATION_INTERVAL_MS);
            }

            // Populate immediately, then read once more after connect() settles to
            // catch transitions that occurred while the realtime source started.
            await reconcileLatest();
            if (active && laneMapReady) setIsLoading(false);
            await Promise.allSettled(connectionPromises);
            if (active) await reconcileLatest();
        };

        void initializeAndSubscribe();
        return () => {
            active = false;
            if (reconciliationTimer != null)
                window.clearInterval(reconciliationTimer);
            bindings.forEach((binding) => binding.cleanup?.());
        };
    }, [laneMap, laneMapReady, laneMapRef]);

    const thresholdMilliseconds = thresholdMinutes * 60 * 1000;
    const laneRows = useMemo(() => lanes.map((lane) => {
        const occupancyDuration = lane.occupancyStartedAt == null ? 0 : now - lane.occupancyStartedAt;
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
    }), [lanes, now, thresholdMilliseconds]);

    const summary = useMemo(() => ({
        healthy: laneRows.filter((lane) => !lane.hasFault && !lane.hasOfflineComponent && !lane.hasUnknownTelemetry).length,
        faulted: laneRows.filter((lane) => lane.hasFault).length,
        disconnected: laneRows.filter((lane) => lane.hasOfflineComponent).length,
        unknown: laneRows.filter((lane) => lane.hasUnknownTelemetry).length,
    }), [laneRows]);

    const handleThresholdChange = (value: number) => {
        const next = Math.min(MAX_OCCUPANCY_THRESHOLD_MINUTES, Math.max(1, value || 1));
        setThresholdMinutes(next);
        window.localStorage.setItem(OCCUPANCY_THRESHOLD_KEY, String(next));
    };

    return (
        <Stack spacing={2} sx={{pr: 2, pb: 2}}>
            <Stack direction={{xs: "column", md: "row"}} justifyContent="space-between" alignItems={{xs: "stretch", md: "center"}} spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <MonitorHeartRounded color="primary" sx={{fontSize: 36}}/>
                    <Box>
                        <Typography variant="h4" component="h1">{t("stateOfHealth")}</Typography>
                        <Typography variant="body2" color="text.secondary">{t("healthDescription")}</Typography>
                    </Box>
                </Stack>
                <Paper variant="outlined" sx={{p: 1.5}}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box>
                            <Typography variant="caption" color="text.secondary">{t("extendedOccupancyThreshold")}</Typography>
                            <Typography variant="body2">{t("savedForThisBrowser")}</Typography>
                        </Box>
                        <TextField
                            aria-label={t("extendedOccupancyThreshold")}
                            type="number"
                            size="small"
                            value={thresholdMinutes}
                            onChange={(event) => handleThresholdChange(Number(event.target.value))}
                            inputProps={{min: 1, max: MAX_OCCUPANCY_THRESHOLD_MINUTES, step: 1}}
                            InputProps={{endAdornment: <InputAdornment position="end">{t("minutes")}</InputAdornment>}}
                            sx={{width: 145}}
                        />
                    </Stack>
                </Paper>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip color="success" variant="outlined" label={`${t("healthyLanes")}: ${summary.healthy}`}/>
                <Chip color="error" variant="outlined" label={`${t("lanesWithFaults")}: ${summary.faulted}`}/>
                <Chip color="warning" variant="outlined" label={`${t("lanesWithDisconnections")}: ${summary.disconnected}`}/>
                <Chip variant="outlined" label={`${t("lanesAwaitingTelemetry")}: ${summary.unknown}`}/>
                <Chip variant="outlined" label={`${t("totalLanes")}: ${laneRows.length}`}/>
            </Stack>

            {isLoading && laneRows.length === 0 ? (
                <Paper variant="outlined" sx={{p: 6, textAlign: "center"}}>
                    <CircularProgress size={30}/>
                    <Typography sx={{mt: 2}} color="text.secondary">{t("loadingLaneHealth")}</Typography>
                </Paper>
            ) : laneRows.length === 0 ? (
                <Alert severity="info">{t("noLanesAvailable")}</Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table aria-label={t("stateOfHealth")} sx={{minWidth: 1050}}>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("lane")}</TableCell>
                                <TableCell>{t("connections")}</TableCell>
                                <TableCell>{t("faultStatus")}</TableCell>
                                <TableCell>{t("currentOccupancy")}</TableCell>
                                <TableCell>{t("lastUpdate")}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {laneRows.map((lane) => (
                                <TableRow
                                    key={lane.laneName}
                                    data-testid={`health-lane-${lane.laneName}`}
                                    sx={{
                                        bgcolor: lane.hasFault ? "rgba(211, 47, 47, 0.055)" : lane.hasOfflineComponent ? "rgba(237, 108, 2, 0.05)" : undefined,
                                        "&:last-child td": {borderBottom: 0},
                                    }}
                                >
                                    <TableCell sx={{verticalAlign: "top", minWidth: 165}}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            {lane.hasFault
                                                ? <ErrorRounded color="error"/>
                                                : lane.hasOfflineComponent
                                                    ? <RadioButtonUncheckedRounded color="warning"/>
                                                    : lane.hasUnknownTelemetry
                                                        ? <RadioButtonUncheckedRounded sx={{color: "text.disabled"}}/>
                                                        : <CheckCircleRounded color="success"/>}
                                            <Box>
                                                <Typography fontWeight={700}>{lane.laneName}</Typography>
                                                <Typography variant="caption" color="text.secondary">{lane.nodeName}</Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{verticalAlign: "top", minWidth: 240}}>
                                        <Stack spacing={0.75} alignItems="flex-start">
                                            <StatusIndicator
                                                component={{...lane.rpm, label: `RPM (${lane.rpm.label})`}}
                                                labels={{online: t("online"), offline: t("offline"), unknown: t("waiting")}}
                                            />
                                            {lane.cameras.length > 0 ? lane.cameras.map((camera) => (
                                                <StatusIndicator
                                                    key={camera.id}
                                                    component={camera}
                                                    labels={{online: t("online"), offline: t("offline"), unknown: t("waiting")}}
                                                />
                                            )) : (
                                                <Chip size="small" variant="outlined" icon={<VideocamRounded/>} label={t("noCameras")}/>
                                            )}
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{verticalAlign: "top", minWidth: 390}}>
                                        <Stack direction="row" gap={0.75} flexWrap="wrap">
                                            <FaultIndicator label={t("gammaHigh")} state={lane.faults.gammaHigh} faultText={t("fault")} clearText={t("clear")} unknownText={t("unknown")}/>
                                            <FaultIndicator label={t("gammaLow")} state={lane.faults.gammaLow} faultText={t("fault")} clearText={t("clear")} unknownText={t("unknown")}/>
                                            <FaultIndicator label={t("neutronHigh")} state={lane.faults.neutronHigh} faultText={t("fault")} clearText={t("clear")} unknownText={t("unknown")}/>
                                            <FaultIndicator label={t("tamper")} state={lane.faults.tamper} faultText={t("fault")} clearText={t("clear")} unknownText={t("unknown")}/>
                                            <FaultIndicator label={t("extendedOccupancy")} state={lane.extendedOccupancy} faultText={t("fault")} clearText={t("clear")} unknownText={t("unknown")}/>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{verticalAlign: "top", minWidth: 150}}>
                                        {lane.occupancyState === "unknown" ? (
                                            <Typography variant="body2" color="text.secondary">{t("waitingForTelemetry")}</Typography>
                                        ) : lane.occupancyState === "clear" ? (
                                            <Typography variant="body2" color="text.secondary">{t("notOccupied")}</Typography>
                                        ) : lane.occupancyStartedAt == null ? (
                                            <Stack spacing={0.5}>
                                                <Typography variant="body2" color="text.secondary">{t("waitingForTelemetry")}</Typography>
                                                <Typography variant="caption" color="text.secondary">{t("occupancyInProgress")}</Typography>
                                            </Stack>
                                        ) : (
                                            <Stack spacing={0.5}>
                                                <Typography fontWeight={700} color={lane.extendedOccupancy === "active" ? "error.main" : "text.primary"}>
                                                    {formatDuration(lane.occupancyDuration)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">{t("occupancyInProgress")}</Typography>
                                            </Stack>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{verticalAlign: "top", whiteSpace: "nowrap"}}>
                                        <Typography variant="body2" color="text.secondary">
                                            {lane.lastUpdatedAt ? new Date(lane.lastUpdatedAt).toLocaleTimeString() : t("waitingForTelemetry")}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Stack>
    );
}
