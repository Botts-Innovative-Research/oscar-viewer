"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import dynamic from "next/dynamic";
import {Box, CircularProgress} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import MediationIcon from "@mui/icons-material/Mediation";
import InsertChartIcon from "@mui/icons-material/InsertChart";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import PreviewRoundedIcon from "@mui/icons-material/PreviewRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import {WidgetType} from "@/lib/layout/PageConfigTypes";
import {WidgetComponent, WidgetConfigFormComponent} from "./WidgetTypes";

import SystemStatusWidget from "@/app/_components/widgets/SystemStatusWidget";
import EventTableWidget from "@/app/_components/widgets/EventTableWidget";
import AdjudicationTableWidget from "@/app/_components/widgets/AdjudicationTableWidget";
import LaneDetailStatusWidget from "@/app/_components/widgets/LaneDetailStatusWidget";
import StatusTableWidget from "@/app/_components/widgets/StatusTableWidget";
import NationalStatsWidget from "@/app/_components/widgets/NationalStatsWidget";

import SystemStatusConfigForm from "@/app/_components/widgets/config/SystemStatusConfigForm";
import MapConfigForm from "@/app/_components/widgets/config/MapConfigForm";
import EventTableConfigForm from "@/app/_components/widgets/config/EventTableConfigForm";
import VideoConfigForm from "@/app/_components/widgets/config/VideoConfigForm";
import ChartConfigForm from "@/app/_components/widgets/config/ChartConfigForm";
import StatusTableConfigForm from "@/app/_components/widgets/config/StatusTableConfigForm";
import NationalStatsConfigForm from "@/app/_components/widgets/config/NationalStatsConfigForm";
import LaneDetailStatusConfigForm from "@/app/_components/widgets/config/LaneDetailStatusConfigForm";

const widgetLoading = () => (
    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
        <CircularProgress size={24}/>
    </Box>
);

// Browser-only widgets (Leaflet, HLS, chart.js canvas, event preview media)
// load client-side only — the static export prerender must not touch them.
const MapWidget = dynamic(() => import("@/app/_components/widgets/MapWidget"), {ssr: false, loading: widgetLoading});
const VideoWidget = dynamic(() => import("@/app/_components/widgets/VideoWidget"), {ssr: false, loading: widgetLoading});
const ChartWidget = dynamic(() => import("@/app/_components/widgets/ChartWidget"), {ssr: false, loading: widgetLoading});
const QuickViewWidget = dynamic(() => import("@/app/_components/widgets/QuickViewWidget"), {ssr: false, loading: widgetLoading});

export interface WidgetRegistryEntry {
    component: WidgetComponent;
    ConfigForm?: WidgetConfigFormComponent;
    /** i18n key for the default widget title. */
    titleKey: string;
    icon: React.ReactNode;
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
    'system-status': {
        component: SystemStatusWidget,
        ConfigForm: SystemStatusConfigForm,
        titleKey: 'laneStatus',
        icon: <MonitorHeartRoundedIcon/>,
    },
    'map': {
        component: MapWidget as WidgetComponent,
        ConfigForm: MapConfigForm,
        titleKey: 'map',
        icon: <LocationOnRoundedIcon/>,
    },
    'event-table': {
        component: EventTableWidget,
        ConfigForm: EventTableConfigForm,
        titleKey: 'events',
        icon: <TableRowsRoundedIcon/>,
    },
    'adjudication-table': {
        component: AdjudicationTableWidget,
        ConfigForm: EventTableConfigForm,
        titleKey: 'alarmTable',
        icon: <GavelRoundedIcon/>,
    },
    'video': {
        component: VideoWidget as WidgetComponent,
        ConfigForm: VideoConfigForm,
        titleKey: 'videoStream',
        icon: <VideocamRoundedIcon/>,
    },
    'chart': {
        component: ChartWidget as WidgetComponent,
        ConfigForm: ChartConfigForm,
        titleKey: 'countChart',
        icon: <BarChartRoundedIcon/>,
    },
    'national-stats': {
        component: NationalStatsWidget,
        ConfigForm: NationalStatsConfigForm,
        titleKey: 'national',
        icon: <MediationIcon/>,
    },
    'lane-detail-status': {
        component: LaneDetailStatusWidget,
        ConfigForm: LaneDetailStatusConfigForm,
        titleKey: 'laneStatus',
        icon: <FactCheckRoundedIcon/>,
    },
    'status-table': {
        component: StatusTableWidget,
        ConfigForm: StatusTableConfigForm,
        titleKey: 'laneLog',
        icon: <TableRowsRoundedIcon/>,
    },
    'quick-view': {
        component: QuickViewWidget as WidgetComponent,
        ConfigForm: undefined,
        titleKey: 'quickView',
        icon: <PreviewRoundedIcon/>,
    },
};

/** Curated icon set for pages (nav drawer + Add Page dialog). */
export const PAGE_ICONS: Record<string, React.ReactNode> = {
    dashboard: <DashboardRoundedIcon/>,
    warning: <WarningRoundedIcon/>,
    map: <LocationOnRoundedIcon/>,
    mediation: <MediationIcon/>,
    chart: <InsertChartIcon/>,
    grid: <GridViewRoundedIcon/>,
    video: <VideocamRoundedIcon/>,
    table: <TableRowsRoundedIcon/>,
    globe: <PublicRoundedIcon/>,
    star: <StarRoundedIcon/>,
    bolt: <BoltRoundedIcon/>,
    shield: <ShieldRoundedIcon/>,
    lane: <DirectionsCarRoundedIcon/>,
};

export function getPageIcon(iconKey: string | undefined): React.ReactNode {
    return PAGE_ICONS[iconKey ?? ''] ?? <GridViewRoundedIcon/>;
}
