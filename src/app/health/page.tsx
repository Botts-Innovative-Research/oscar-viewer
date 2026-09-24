"use client";

import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
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
    isTamperDataStream,
    isVideoDataStream,
} from "@/lib/data/oscar/Utilities";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {EventType} from "osh-js/source/core/event/EventType";

type ConnectionState = "online" | "offline" | "unknown";

interface ComponentHealth {
    id: string;
    label: string;
    state: ConnectionState;
}

interface FaultHealth {
    gammaHigh: boolean;
    gammaLow: boolean;
    neutronHigh: boolean;
    tamper: boolean;
}

interface LaneHealth {
    laneName: string;
    nodeName: string;
    rpm: ComponentHealth;
    cameras: ComponentHealth[];
    faults: FaultHealth;
    occupancyStartedAt: number | null;
    lastUpdatedAt: number | null;
}

interface StreamBinding {
    key: string;
    laneName: string;
    stream: any;
    datasource: any;
    systemId: string;
    cameraSystemIds: Set<string>;
}

const OCCUPANCY_THRESHOLD_KEY = "oscar.health.extendedOccupancyMinutes";
const DEFAULT_OCCUPANCY_THRESHOLD_MINUTES = 1;
const MAX_OCCUPANCY_THRESHOLD_MINUTES = 1440;

const faultDefaults = (): FaultHealth => ({
    gammaHigh: false,
    gammaLow: false,
    neutronHigh: false,
    tamper: false,
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
    return message?.values?.[0]?.data;
}

function isOccupancyState(state: unknown): boolean {
    return state === "Scan" || state === "Alarm";
}

function observationTimestamp(observation: any): number | null {
    const value = observation?.resultTime ?? observation?.phenomenonTime ??
        observation?.properties?.resultTime ?? observation?.properties?.phenomenonTime ??
        observation?.result?.samplingTime;
    const timestamp = typeof value === "number" ? value * (value < 1_000_000_000_000 ? 1000 : 1) : Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
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

function FaultIndicator({label, active, faultText, clearText}: {
    label: string;
    active: boolean;
    faultText: string;
    clearText: string;
}) {
    return (
        <Chip
            size="small"
            color={active ? "error" : "default"}
            variant={active ? "filled" : "outlined"}
            icon={active ? <ErrorRounded/> : <CheckCircleRounded/>}
            label={`${label}: ${active ? faultText : clearText}`}
            sx={{fontWeight: active ? 700 : 400}}
        />
    );
}

function buildLaneHealth(laneName: string, lane: LaneMapEntry): LaneHealth {
    const cameraSystemIds = new Set<string>();

    lane.systems.forEach((system: any) => {
        if (isCameraSystem(system))
            cameraSystemIds.add(systemId(system));
    });
    lane.datastreams.forEach((stream: any) => {
        if (isVideoDataStream(stream))
            cameraSystemIds.add(streamSystemId(stream));
    });

    const cameras = lane.systems
        .filter((system: any) => cameraSystemIds.has(systemId(system)))
        .map((system: any) => ({
            id: systemId(system),
            label: systemName(system) || "Camera",
            state: "unknown" as ConnectionState,
        }))
        .sort((a: ComponentHealth, b: ComponentHealth) => a.label.localeCompare(b.label, undefined, {numeric: true}));

    const rpmStream = lane.datastreams.find((stream: any) =>
        !cameraSystemIds.has(streamSystemId(stream)) &&
        (isGammaDataStream(stream) || isNeutronDataStream(stream) || isTamperDataStream(stream))
    );
    const rpmSystem = lane.systems.find((system: any) => systemId(system) === streamSystemId(rpmStream));

    return {
        laneName,
        nodeName: lane.parentNode?.name ?? "",
        rpm: {
            id: systemId(rpmSystem) || `${laneName}-rpm`,
            label: systemName(rpmSystem) || "RPM",
            state: "unknown",
        },
        cameras,
        faults: faultDefaults(),
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
    const alarmStatesRef = useRef<Map<string, Map<string, string>>>(new Map());
    const tamperStatesRef = useRef<Map<string, Map<string, boolean>>>(new Map());

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
        const currentLaneMap = laneMapRef.current;
        const sortedEntries = Array.from(currentLaneMap.entries())
            .sort(([a], [b]) => a.localeCompare(b, undefined, {numeric: true, sensitivity: "base"}));
        const initialLanes = sortedEntries.map(([laneName, lane]) => buildLaneHealth(laneName, lane));
        const bindings: StreamBinding[] = [];

        alarmStatesRef.current.clear();
        tamperStatesRef.current.clear();
        setLanes(initialLanes);
        setIsLoading(!laneMapReady);

        const updateLane = (laneName: string, updater: (lane: LaneHealth) => LaneHealth) => {
            if (!active) return;
            setLanes((current) => current.map((lane) => lane.laneName === laneName ? updater(lane) : lane));
        };

        const applyAlarmState = (laneName: string, key: string, state: unknown, occupancyStartHint: number | null = null) => {
            if (typeof state !== "string") return;
            const laneStates = alarmStatesRef.current.get(laneName) ?? new Map<string, string>();
            laneStates.set(key, state);
            alarmStatesRef.current.set(laneName, laneStates);

            const values = Array.from(laneStates.values());
            const isOccupied = values.some(isOccupancyState);
            const timestamp = Date.now();
            updateLane(laneName, (lane) => ({
                ...lane,
                faults: {
                    ...lane.faults,
                    gammaHigh: values.includes("Fault - Gamma High"),
                    gammaLow: values.includes("Fault - Gamma Low"),
                    neutronHigh: values.includes("Fault - Neutron High"),
                },
                occupancyStartedAt: isOccupied ? (
                    lane.occupancyStartedAt == null
                        ? occupancyStartHint ?? timestamp
                        : occupancyStartHint == null
                            ? lane.occupancyStartedAt
                            : Math.min(lane.occupancyStartedAt, occupancyStartHint)
                ) : null,
                lastUpdatedAt: timestamp,
            }));
        };

        const applyTamperState = (laneName: string, key: string, state: unknown) => {
            if (typeof state !== "boolean") return;
            const laneStates = tamperStatesRef.current.get(laneName) ?? new Map<string, boolean>();
            laneStates.set(key, state);
            tamperStatesRef.current.set(laneName, laneStates);
            const timestamp = Date.now();
            updateLane(laneName, (lane) => ({
                ...lane,
                faults: {...lane.faults, tamper: Array.from(laneStates.values()).some(Boolean)},
                lastUpdatedAt: timestamp,
            }));
        };

        const applyConnectionState = (binding: StreamBinding, result: any) => {
            const state = getConnectionState(result);
            if (state === "unknown") return;
            const timestamp = Date.now();
            updateLane(binding.laneName, (lane) => {
                if (binding.cameraSystemIds.has(binding.systemId)) {
                    return {
                        ...lane,
                        cameras: lane.cameras.map((camera) => camera.id === binding.systemId ? {...camera, state} : camera),
                        lastUpdatedAt: timestamp,
                    };
                }
                return {...lane, rpm: {...lane.rpm, state}, lastUpdatedAt: timestamp};
            });
        };

        sortedEntries.forEach(([laneName, lane]) => {
            const cameraSystemIds = new Set(
                buildLaneHealth(laneName, lane).cameras.map((camera) => camera.id)
            );

            lane.datastreams.forEach((stream: any, index: number) => {
                if (!isConnectionDataStream(stream) && !isGammaDataStream(stream) &&
                    !isNeutronDataStream(stream) && !isTamperDataStream(stream))
                    return;

                const datasource = lane.datasourcesRealtime?.[index];
                if (!datasource) return;
                datasource.properties.startTime = new Date().toISOString();
                datasource.properties.endTime = "2055-01-01T08:13:25.845Z";
                bindings.push({
                    key: stream?.properties?.id ?? `${laneName}-${index}`,
                    laneName,
                    stream,
                    datasource,
                    systemId: streamSystemId(stream),
                    cameraSystemIds,
                });
            });
        });

        const initializeAndSubscribe = async () => {
            await Promise.allSettled(bindings.map(async (binding) => {
                try {
                    const query = await binding.stream.searchObservations(
                        new ObservationFilter({resultTime: "latest"}), 1
                    );
                    const observations = await query.nextPage();
                    const result = observations?.[0]?.result;
                    if (isConnectionDataStream(binding.stream))
                        applyConnectionState(binding, result);
                    else if (isTamperDataStream(binding.stream))
                        applyTamperState(binding.laneName, binding.key, result?.tamperStatus);
                    else {
                        let occupancyStartHint: number | null = null;
                        if (isOccupancyState(result?.alarmState)) {
                            try {
                                const backgroundQuery = await binding.stream.searchObservations(
                                    new ObservationFilter({
                                        resultTime: `../${new Date().toISOString()}`,
                                        filter: "alarmState = 'Background'",
                                        order: "desc",
                                    }), 1
                                );
                                const backgroundObservations = await backgroundQuery.nextPage();
                                occupancyStartHint = observationTimestamp(backgroundObservations?.[0]);
                            } catch (error) {
                                console.warn(`Unable to determine occupancy start for ${binding.laneName}`, error);
                            }
                        }
                        applyAlarmState(binding.laneName, binding.key, result?.alarmState, occupancyStartHint);
                    }
                } catch (error) {
                    console.warn(`Unable to fetch latest health status for ${binding.laneName}`, error);
                }
            }));

            if (!active) return;
            bindings.forEach((binding) => {
                binding.datasource.subscribe((message: any) => {
                    if (!active) return;
                    const result = getMessageResult(message);
                    if (isConnectionDataStream(binding.stream))
                        applyConnectionState(binding, result);
                    else if (isTamperDataStream(binding.stream))
                        applyTamperState(binding.laneName, binding.key, result?.tamperStatus);
                    else
                        applyAlarmState(binding.laneName, binding.key, result?.alarmState);
                }, [EventType.DATA]);
                Promise.resolve(binding.datasource.connect()).catch((error) =>
                    console.warn(`Unable to subscribe to health status for ${binding.laneName}`, error)
                );
            });
            setIsLoading(false);
        };

        void initializeAndSubscribe();
        return () => {
            active = false;
        };
    }, [laneMap, laneMapReady, laneMapRef]);

    const thresholdMilliseconds = thresholdMinutes * 60 * 1000;
    const laneRows = useMemo(() => lanes.map((lane) => {
        const occupancyDuration = lane.occupancyStartedAt == null ? 0 : now - lane.occupancyStartedAt;
        const extendedOccupancy = lane.occupancyStartedAt != null && occupancyDuration >= thresholdMilliseconds;
        const hasFault = Object.values(lane.faults).some(Boolean) || extendedOccupancy;
        const hasOfflineComponent = lane.rpm.state === "offline" || lane.cameras.some((camera) => camera.state === "offline");
        const hasUnknownComponent = lane.rpm.state === "unknown" || lane.cameras.some((camera) => camera.state === "unknown");
        return {...lane, occupancyDuration, extendedOccupancy, hasFault, hasOfflineComponent, hasUnknownComponent};
    }), [lanes, now, thresholdMilliseconds]);

    const summary = useMemo(() => ({
        healthy: laneRows.filter((lane) => !lane.hasFault && !lane.hasOfflineComponent && !lane.hasUnknownComponent).length,
        faulted: laneRows.filter((lane) => lane.hasFault).length,
        disconnected: laneRows.filter((lane) => lane.hasOfflineComponent).length,
        unknown: laneRows.filter((lane) => lane.hasUnknownComponent).length,
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
                            inputProps={{min: 1, max: MAX_OCCUPANCY_THRESHOLD_MINUTES}}
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
                                                    : lane.hasUnknownComponent
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
                                            <FaultIndicator label={t("gammaHigh")} active={lane.faults.gammaHigh} faultText={t("fault")} clearText={t("clear")}/>
                                            <FaultIndicator label={t("gammaLow")} active={lane.faults.gammaLow} faultText={t("fault")} clearText={t("clear")}/>
                                            <FaultIndicator label={t("neutronHigh")} active={lane.faults.neutronHigh} faultText={t("fault")} clearText={t("clear")}/>
                                            <FaultIndicator label={t("tamper")} active={lane.faults.tamper} faultText={t("fault")} clearText={t("clear")}/>
                                            <FaultIndicator label={t("extendedOccupancy")} active={lane.extendedOccupancy} faultText={t("fault")} clearText={t("clear")}/>
                                        </Stack>
                                    </TableCell>
                                    <TableCell sx={{verticalAlign: "top", minWidth: 150}}>
                                        {lane.occupancyStartedAt == null ? (
                                            <Typography variant="body2" color="text.secondary">{t("notOccupied")}</Typography>
                                        ) : (
                                            <Stack spacing={0.5}>
                                                <Typography fontWeight={700} color={lane.extendedOccupancy ? "error.main" : "text.primary"}>
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
