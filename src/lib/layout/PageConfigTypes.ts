/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

/**
 * Schema for user-configurable widget pages. Persisted via redux-persist
 * (pageLayoutSlice) and exported/imported as JSON files. Lane/system
 * references are stored as plain strings only — never LaneMapEntry or
 * datasource objects.
 */

export const PAGE_CONFIG_SCHEMA_VERSION = 1;

export type WidgetType =
    | 'system-status'
    | 'map'
    | 'event-table'
    | 'adjudication-table'
    | 'video'
    | 'chart'
    | 'national-stats'
    | 'lane-detail-status'
    | 'status-table'
    | 'quick-view';

export type RGLBreakpoint = 'lg' | 'md' | 'sm';

export const RGL_BREAKPOINTS: Record<RGLBreakpoint, number> = {lg: 1200, md: 900, sm: 0};
export const RGL_COLS: Record<RGLBreakpoint, number> = {lg: 12, md: 8, sm: 4};
export const RGL_ROW_HEIGHT = 40;

/** RGL-native layout entry; `i` is the WidgetInstance id. */
export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    static?: boolean;
}

/** Which lanes a multi-lane widget shows. */
export type LaneSelection =
    | { mode: 'all' }
    | { mode: 'include'; lanes: string[] };

/** How a single-lane widget resolves its lane. */
export type LaneSource =
    | { source: 'page' }
    | { source: 'explicit'; lane: string };

export type EventTableColumnKey =
    | 'laneId'
    | 'occupancyCount'
    | 'startTime'
    | 'endTime'
    | 'maxGamma'
    | 'maxNeutron'
    | 'status'
    | 'adjudicatedIds'
    | 'adjudicationGroup'
    | 'secondaryInspection';

export interface EventTableColumnSetting {
    key: EventTableColumnKey;
    visible: boolean;
}

export interface EventTableFilters {
    lanes: LaneSelection;
    /** Alarm statuses to include; undefined/empty = all. */
    status?: string[];
    adjudicated?: 'any' | 'yes' | 'no';
    dateRange?: { start?: string; end?: string };
}

export interface SystemStatusWidgetConfig {
    lanes: LaneSelection;
}

export interface MapWidgetConfig {
    lanes: LaneSelection;
}

export interface EventTableWidgetConfig {
    /** Column order = array order. */
    columns: EventTableColumnSetting[];
    filters: EventTableFilters;
}

export type AdjudicationTableWidgetConfig = EventTableWidgetConfig;

export interface VideoWidgetConfig {
    laneSource: LaneSource;
    /** Control stream id when the lane exposes more than one video stream. */
    streamId?: string;
}

export interface ChartWidgetConfig {
    laneSource: LaneSource;
    channel: 'gamma' | 'neutron';
    showThreshold: boolean;
}

export interface NationalStatsWidgetConfig {
    defaultTimeRange?: string;
}

export interface LaneDetailStatusWidgetConfig {
    laneSource: LaneSource;
}

export interface StatusTableWidgetConfig {
    laneSource: LaneSource;
    defaultView: 'occupancy' | 'fault';
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface QuickViewWidgetConfig {
}

export type WidgetConfig =
    | SystemStatusWidgetConfig
    | MapWidgetConfig
    | EventTableWidgetConfig
    | AdjudicationTableWidgetConfig
    | VideoWidgetConfig
    | ChartWidgetConfig
    | NationalStatsWidgetConfig
    | LaneDetailStatusWidgetConfig
    | StatusTableWidgetConfig
    | QuickViewWidgetConfig;

export interface WidgetInstance {
    /** Unique per page; doubles as the RGL layout key. */
    id: string;
    type: WidgetType;
    /** User override; default title comes from the widget registry (i18n key). */
    title?: string;
    config: WidgetConfig;
}

export type PageLaneContext =
    | { mode: 'global' }
    | { mode: 'fixed'; lane: string };

export interface PageConfig {
    /** Seeded ids: 'dashboard' | 'event-log' | 'map' | 'national-view' | 'lane-view'; user pages: uuid. */
    id: string;
    /** Seeded pages store an i18n key; user pages store literal text. seededRoute distinguishes. */
    title: string;
    /** Key into the curated PAGE_ICONS map. */
    icon?: string;
    /** Present only on seeded pages; they render at their original route. */
    seededRoute?: string;
    /** Hide from the nav drawer (e.g. lane-view is reached by clicking a lane). */
    showInNav?: boolean;
    /** Page-level lane parameter for widgets with laneSource {source:'page'}. */
    laneContext?: PageLaneContext;
    widgets: WidgetInstance[];
    layouts: Partial<Record<RGLBreakpoint, LayoutItem[]>>;
}

export interface PageLayoutState {
    schemaVersion: number;
    /** Order = nav order. */
    pages: PageConfig[];
    /**
     * Seeded pages the user explicitly deleted. Rehydrate re-seeds missing
     * seeded pages (app-upgrade self-healing) unless listed here.
     */
    removedSeededPageIds: string[];
    /** Page currently in edit mode; transient. */
    editModePageId: string | null;
}

/** On-disk JSON file format for export/import. */
export interface ExportedConfig {
    kind: 'oscar-viewer-pages';
    schemaVersion: number;
    exportedAt: string;
    pages: PageConfig[];
}

export const SEEDED_PAGE_IDS = ['dashboard', 'event-log', 'map', 'national-view', 'lane-view'] as const;
export type SeededPageId = typeof SEEDED_PAGE_IDS[number];

export const KNOWN_WIDGET_TYPES: WidgetType[] = [
    'system-status', 'map', 'event-table', 'adjudication-table', 'video',
    'chart', 'national-stats', 'lane-detail-status', 'status-table', 'quick-view'
];

/** Default/min widget sizes in grid units (lg 12-col basis, row height 40px). */
export const WIDGET_SIZES: Record<WidgetType, { defaultSize: { w: number, h: number }, minSize: { w: number, h: number } }> = {
    'system-status': {defaultSize: {w: 8, h: 5}, minSize: {w: 2, h: 2}},
    'map': {defaultSize: {w: 6, h: 8}, minSize: {w: 3, h: 4}},
    'event-table': {defaultSize: {w: 12, h: 8}, minSize: {w: 4, h: 5}},
    'adjudication-table': {defaultSize: {w: 12, h: 8}, minSize: {w: 4, h: 5}},
    'video': {defaultSize: {w: 4, h: 7}, minSize: {w: 2, h: 4}},
    'chart': {defaultSize: {w: 6, h: 5}, minSize: {w: 3, h: 3}},
    'national-stats': {defaultSize: {w: 12, h: 9}, minSize: {w: 6, h: 5}},
    'lane-detail-status': {defaultSize: {w: 12, h: 2}, minSize: {w: 4, h: 2}},
    'status-table': {defaultSize: {w: 12, h: 8}, minSize: {w: 4, h: 4}},
    'quick-view': {defaultSize: {w: 4, h: 13}, minSize: {w: 3, h: 6}},
};

export const DEFAULT_EVENT_TABLE_COLUMNS: EventTableColumnSetting[] = [
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
];

/** Fresh default config for a newly added widget of the given type. */
export function buildDefaultWidgetConfig(type: WidgetType): WidgetConfig {
    switch (type) {
        case 'system-status':
        case 'map':
            return {lanes: {mode: 'all'}};
        case 'event-table':
        case 'adjudication-table':
            return {
                columns: DEFAULT_EVENT_TABLE_COLUMNS.map((c) => ({...c})),
                filters: {lanes: {mode: 'all'}, adjudicated: 'any'},
            };
        case 'video':
            return {laneSource: {source: 'page'}};
        case 'chart':
            return {laneSource: {source: 'page'}, channel: 'gamma', showThreshold: true};
        case 'national-stats':
            return {};
        case 'lane-detail-status':
            return {laneSource: {source: 'page'}};
        case 'status-table':
            return {laneSource: {source: 'page'}, defaultView: 'occupancy'};
        case 'quick-view':
            return {};
    }
}
