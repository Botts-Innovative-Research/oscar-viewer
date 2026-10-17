"use client";

import React, {useEffect, useMemo, useState} from "react";
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

import {useLanguage} from "@/app/contexts/LanguageContext";
import {
    deriveLaneHealthRows,
    formatHealthDuration,
    MAX_OCCUPANCY_THRESHOLD_MINUTES,
    summarizeLaneHealth,
    useLaneHealth,
    type ComponentHealth,
    type ConnectionState,
    type TelemetryState,
} from "@/lib/data/oscar/useLaneHealth";

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

export default function HealthPage() {
    const {t} = useLanguage();
    const {lanes, isLoading, thresholdMinutes, setThresholdMinutes} = useLaneHealth();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const laneRows = useMemo(
        () => deriveLaneHealthRows(lanes, now, thresholdMinutes),
        [lanes, now, thresholdMinutes],
    );
    const summary = useMemo(() => summarizeLaneHealth(laneRows), [laneRows]);

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
                            onChange={(event) => setThresholdMinutes(Number(event.target.value))}
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
                                                    {formatHealthDuration(lane.occupancyDuration)}
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
