"use client";

import {
    Box,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import SensorsOffRoundedIcon from "@mui/icons-material/SensorsOffRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import VideocamOffRoundedIcon from "@mui/icons-material/VideocamOffRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import ClearIcon from "@mui/icons-material/Clear";
import React, {memo} from "react";

import {useLanguage} from "@/app/contexts/LanguageContext";
import type {
    ComponentHealth,
    ConnectionState,
    LaneHealthRow,
    TelemetryState,
} from "@/lib/data/oscar/useLaneHealth";

function stateColor(state: ConnectionState | TelemetryState): string {
    if (state === "online" || state === "clear") return "success.main";
    if (state === "offline" || state === "active") return "error.main";
    return "text.disabled";
}

function ConnectionIndicator({
    component,
    kind,
    laneName,
    labels,
}: {
    component: ComponentHealth;
    kind: "rpm" | "camera";
    laneName: string;
    labels: Record<ConnectionState, string>;
}) {
    const isRpm = kind === "rpm";
    const isOffline = component.state === "offline";
    const Icon = isRpm
        ? (isOffline ? SensorsOffRoundedIcon : SensorsRoundedIcon)
        : (isOffline ? VideocamOffRoundedIcon : VideocamRoundedIcon);
    const label = `${component.label}: ${labels[component.state]}`;
    return (
        <Tooltip title={label} arrow placement="top">
            <Box
                component="span"
                role="img"
                aria-label={label}
                data-testid={`lane-health-${laneName}-${kind}`}
                data-component-id={component.id}
                data-state={component.state}
                sx={{display: "inline-flex", color: stateColor(component.state)}}
            >
                <Icon sx={{fontSize: 18}}/>
                {component.state === "unknown" && (
                    <Box component="span" aria-hidden sx={{fontSize: 11, fontWeight: 800, lineHeight: 1}}>?</Box>
                )}
            </Box>
        </Tooltip>
    );
}

function FaultIndicator({
    laneName,
    kind,
    label,
    state,
    glyph,
}: {
    laneName: string;
    kind: string;
    label: string;
    state: TelemetryState;
    glyph?: string;
}) {
    const {t} = useLanguage();
    if (state === "clear") return null;
    const stateLabel = state === "active" ? t("fault") : t("unknown");
    const accessibleLabel = `${label}: ${stateLabel}`;
    return (
        <Tooltip title={accessibleLabel} arrow placement="top">
            <Box
                component="span"
                role="img"
                aria-label={accessibleLabel}
                data-testid={`lane-health-${laneName}-${kind}`}
                data-state={state}
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 18,
                    height: 18,
                    color: stateColor(state),
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1,
                }}
            >
                {glyph ?? (kind === "extended-occupancy"
                    ? <TimerRoundedIcon sx={{fontSize: 18}}/>
                    : <ReportProblemRoundedIcon sx={{fontSize: 18}}/>)}
                {state === "unknown" && (
                    <Box component="span" aria-hidden sx={{ml: 0.125, fontSize: 11, fontWeight: 800, lineHeight: 1}}>?</Box>
                )}
            </Box>
        </Tooltip>
    );
}

function LaneStatusItem({
    health,
    onSelect,
    onClearTamper,
}: {
    health: LaneHealthRow;
    onSelect: () => void;
    onClearTamper: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    const {t} = useLanguage();
    const connectionLabels = {
        online: t("online"),
        offline: t("offline"),
        unknown: t("unknown"),
    };
    const backgroundColor = health.hasFault
        ? "rgba(211, 47, 47, 0.055)"
        : health.hasOfflineComponent
            ? "rgba(237, 108, 2, 0.05)"
            : "inherit";

    return (
        <Paper
            variant="outlined"
            data-testid={`lane-health-card-${health.laneName}`}
            sx={{
                p: 0,
                minHeight: 34,
                display: "flex",
                alignItems: "center",
                backgroundColor,
            }}
        >
            <Box
                role="link"
                tabIndex={0}
                aria-label={`${health.nodeName} - ${health.laneName}`}
                onClick={onSelect}
                onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ")
                        return;
                    event.preventDefault();
                    onSelect();
                }}
                sx={{
                    cursor: "pointer",
                    px: 1,
                    py: 0.625,
                    minWidth: 0,
                    flex: 1,
                    "&:focus-visible": {outline: "2px solid", outlineColor: "primary.main", outlineOffset: 1},
                }}
            >
                <Stack direction="row" spacing={0.75} sx={{alignItems: "center", width: "100%", minWidth: 0, flexWrap: "wrap"}}>
                    <Tooltip title={`${health.nodeName} - ${health.laneName}`} arrow placement="bottom">
                        <Typography
                            variant="body1"
                            sx={{fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120}}
                        >
                            {health.laneName}
                        </Typography>
                    </Tooltip>

                    <ConnectionIndicator
                        component={health.rpm}
                        kind="rpm"
                        laneName={health.laneName}
                        labels={connectionLabels}
                    />
                    {health.cameras.map((camera) => (
                        <ConnectionIndicator
                            key={camera.id}
                            component={camera}
                            kind="camera"
                            laneName={health.laneName}
                            labels={connectionLabels}
                        />
                    ))}

                    <FaultIndicator laneName={health.laneName} kind="gamma-high" label={t("gammaHigh")} state={health.faults.gammaHigh} glyph="γ↑"/>
                    <FaultIndicator laneName={health.laneName} kind="gamma-low" label={t("gammaLow")} state={health.faults.gammaLow} glyph="γ↓"/>
                    <FaultIndicator laneName={health.laneName} kind="neutron-high" label={t("neutronHigh")} state={health.faults.neutronHigh} glyph="n↑"/>
                    <FaultIndicator laneName={health.laneName} kind="tamper" label={t("tamper")} state={health.faults.tamper}/>
                    <FaultIndicator laneName={health.laneName} kind="extended-occupancy" label={t("extendedOccupancy")} state={health.extendedOccupancy}/>
                </Stack>
            </Box>

            {health.faults.tamper === "active" && (
                <Tooltip title={t("clearTamper")} arrow placement="top">
                    <IconButton
                        aria-label={t("clearTamperForLane", {lane: health.laneName})}
                        size="small"
                        onClick={onClearTamper}
                        sx={{mr: 0.5, p: 0.25}}
                    >
                        <ClearIcon sx={{fontSize: 18}}/>
                    </IconButton>
                </Tooltip>
            )}
        </Paper>
    );
}

export default memo(LaneStatusItem);
