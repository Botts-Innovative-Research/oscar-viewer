/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    LayoutItem,
    PageConfig,
    RGL_COLS,
    RGLBreakpoint,
    WIDGET_SIZES,
    WidgetInstance,
    WidgetType,
} from './PageConfigTypes';

function widget(id: string, type: WidgetType, config: WidgetInstance['config']): WidgetInstance {
    return {id, type, config};
}

function item(i: string, type: WidgetType, x: number, y: number, w: number, h: number): LayoutItem {
    const {minSize} = WIDGET_SIZES[type];
    return {i, x, y, w, h, minW: minSize.w, minH: minSize.h};
}

/**
 * Stack widgets vertically full-width for the narrower breakpoints, keeping
 * each widget's lg height.
 */
function stacked(bp: RGLBreakpoint, entries: { i: string; type: WidgetType; h: number }[]): LayoutItem[] {
    const cols = RGL_COLS[bp];
    let y = 0;
    return entries.map((e) => {
        const it = item(e.i, e.type, 0, y, cols, e.h);
        y += e.h;
        return it;
    });
}

/**
 * The seeded pages reproducing the layout of the original fixed pages.
 * Deterministic ids so reset/re-seed and exports stay stable.
 */
export function buildDefaultPages(): PageConfig[] {
    // --- Dashboard: lane status grid + alarm table, quick view on the right ---
    const dashStatus = widget('dashboard-system-status', 'system-status', {lanes: {mode: 'all'}});
    const dashAlarms = widget('dashboard-alarm-table', 'adjudication-table', {
        columns: [
            {key: 'laneId', visible: true},
            {key: 'occupancyCount', visible: true},
            {key: 'startTime', visible: true},
            {key: 'endTime', visible: true},
            {key: 'maxGamma', visible: true},
            {key: 'maxNeutron', visible: true},
            {key: 'status', visible: true},
            {key: 'adjudicatedIds', visible: true},
            {key: 'adjudicationGroup', visible: true},
            {key: 'secondaryInspection', visible: false},
        ],
        filters: {lanes: {mode: 'all'}, adjudicated: 'any'},
    });
    const dashQuickView = widget('dashboard-quick-view', 'quick-view', {});

    const dashboard: PageConfig = {
        id: 'dashboard',
        title: 'dashboard',
        icon: 'dashboard',
        seededRoute: '/',
        showInNav: true,
        widgets: [dashStatus, dashAlarms, dashQuickView],
        layouts: {
            lg: [
                item(dashStatus.id, 'system-status', 0, 0, 8, 5),
                item(dashAlarms.id, 'adjudication-table', 0, 5, 8, 8),
                item(dashQuickView.id, 'quick-view', 8, 0, 4, 13),
            ],
            md: stacked('md', [
                {i: dashStatus.id, type: 'system-status', h: 5},
                {i: dashAlarms.id, type: 'adjudication-table', h: 8},
                {i: dashQuickView.id, type: 'quick-view', h: 8},
            ]),
            sm: stacked('sm', [
                {i: dashStatus.id, type: 'system-status', h: 5},
                {i: dashAlarms.id, type: 'adjudication-table', h: 8},
                {i: dashQuickView.id, type: 'quick-view', h: 8},
            ]),
        },
    };

    // --- Event Log: single full-width event table ---
    const eventTable = widget('event-log-table', 'event-table', {
        columns: [
            {key: 'laneId', visible: true},
            {key: 'occupancyCount', visible: true},
            {key: 'startTime', visible: true},
            {key: 'endTime', visible: true},
            {key: 'maxGamma', visible: true},
            {key: 'maxNeutron', visible: true},
            {key: 'status', visible: true},
            {key: 'adjudicatedIds', visible: true},
            {key: 'adjudicationGroup', visible: true},
            {key: 'secondaryInspection', visible: true},
        ],
        filters: {lanes: {mode: 'all'}, adjudicated: 'any'},
    });
    const eventLog: PageConfig = {
        id: 'event-log',
        title: 'events',
        icon: 'warning',
        seededRoute: '/event-log/',
        showInNav: true,
        widgets: [eventTable],
        layouts: {
            lg: [item(eventTable.id, 'event-table', 0, 0, 12, 14)],
            md: [item(eventTable.id, 'event-table', 0, 0, 8, 14)],
            sm: [item(eventTable.id, 'event-table', 0, 0, 4, 14)],
        },
    };

    // --- Map: single full-page map ---
    const mapWidget = widget('map-main', 'map', {lanes: {mode: 'all'}});
    const map: PageConfig = {
        id: 'map',
        title: 'map',
        icon: 'map',
        seededRoute: '/map/',
        showInNav: true,
        widgets: [mapWidget],
        layouts: {
            lg: [item(mapWidget.id, 'map', 0, 0, 12, 14)],
            md: [item(mapWidget.id, 'map', 0, 0, 8, 14)],
            sm: [item(mapWidget.id, 'map', 0, 0, 4, 12)],
        },
    };

    // --- National View: stats table with time range controls ---
    const nationalStats = widget('national-view-stats', 'national-stats', {});
    const nationalView: PageConfig = {
        id: 'national-view',
        title: 'national',
        icon: 'mediation',
        seededRoute: '/national-view/',
        showInNav: true,
        widgets: [nationalStats],
        layouts: {
            lg: [item(nationalStats.id, 'national-stats', 0, 0, 12, 14)],
            md: [item(nationalStats.id, 'national-stats', 0, 0, 8, 14)],
            sm: [item(nationalStats.id, 'national-stats', 0, 0, 4, 14)],
        },
    };

    // --- Lane View: status strip, video + gamma/neutron charts, event table ---
    const laneStatus = widget('lane-view-status', 'lane-detail-status', {laneSource: {source: 'page'}});
    const laneVideo = widget('lane-view-video', 'video', {laneSource: {source: 'page'}});
    const laneGamma = widget('lane-view-gamma-chart', 'chart', {
        laneSource: {source: 'page'}, channel: 'gamma', showThreshold: true,
    });
    const laneNeutron = widget('lane-view-neutron-chart', 'chart', {
        laneSource: {source: 'page'}, channel: 'neutron', showThreshold: false,
    });
    const laneTable = widget('lane-view-status-table', 'status-table', {
        laneSource: {source: 'page'}, defaultView: 'occupancy',
    });
    const laneView: PageConfig = {
        id: 'lane-view',
        title: 'laneView',
        icon: 'lane',
        seededRoute: '/lane-view/',
        showInNav: false,
        laneContext: {mode: 'global'},
        widgets: [laneStatus, laneVideo, laneGamma, laneNeutron, laneTable],
        layouts: {
            lg: [
                item(laneStatus.id, 'lane-detail-status', 0, 0, 12, 2),
                item(laneVideo.id, 'video', 0, 2, 6, 8),
                item(laneGamma.id, 'chart', 6, 2, 6, 4),
                item(laneNeutron.id, 'chart', 6, 6, 6, 4),
                item(laneTable.id, 'status-table', 0, 10, 12, 8),
            ],
            md: stacked('md', [
                {i: laneStatus.id, type: 'lane-detail-status', h: 2},
                {i: laneVideo.id, type: 'video', h: 8},
                {i: laneGamma.id, type: 'chart', h: 4},
                {i: laneNeutron.id, type: 'chart', h: 4},
                {i: laneTable.id, type: 'status-table', h: 8},
            ]),
            sm: stacked('sm', [
                {i: laneStatus.id, type: 'lane-detail-status', h: 2},
                {i: laneVideo.id, type: 'video', h: 6},
                {i: laneGamma.id, type: 'chart', h: 4},
                {i: laneNeutron.id, type: 'chart', h: 4},
                {i: laneTable.id, type: 'status-table', h: 8},
            ]),
        },
    };

    return [dashboard, eventLog, map, nationalView, laneView];
}

export function buildDefaultPage(pageId: string): PageConfig | undefined {
    return buildDefaultPages().find((p) => p.id === pageId);
}
