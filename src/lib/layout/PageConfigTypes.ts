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

export const PAGE_CONFIG_SCHEMA_VERSION = 2;

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
    | 'quick-view'
    | 'alarm-stats';

export type RGLBreakpoint = 'lg' | 'md' | 'sm';

export const RGL_BREAKPOINTS: Record<RGLBreakpoint, number> = {lg: 1200, md: 900, sm: 0};
export const RGL_COLS: Record<RGLBreakpoint, number> = {lg: 12, md: 8, sm: 4};
/**
 * Fine-grained rows: with the 8px margin each resize step is 16px. Schema v1
 * used rowHeight 40 (48px steps); v1 row units are migrated x3, which keeps
 * pixel heights identical because 48 = 3 x 16.
 */
export const RGL_ROW_HEIGHT = 8;

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

export type MapAlarmWindow = 'today' | '1h' | '8h' | '24h';

export interface MapWidgetConfig {
    lanes: LaneSelection;
    /** Live-track mobile detectors (RS350 backpack / Kromek D5). Default true. */
    showMobileUnits?: boolean;
    /** Breadcrumb trail behind each mobile detector. Default true. */
    showTrail?: boolean;
    /** Trail length in fixes (~1/s). Default 300. */
    trailLength?: number;
    /** Markers where mobile alarms occurred, colored by adjudication. Default true. */
    showAlarmMarkers?: boolean;
    /** Historical mobile-alarm window. Default 'today'. */
    alarmTimeWindow?: MapAlarmWindow;
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

export type AlarmStatsVisualization =
    | 'rate-trend'
    | 'adjudication-time'
    | 'lane-comparison'
    | 'lane-stack'
    | 'time-profile';
/** '30d' is offered for time-profile only — day-of-week needs several samples per weekday. */
export type AlarmStatsWindow = '1h' | '8h' | '24h' | '7d' | '30d';
export type AlarmStatsBucket = 'auto' | '1m' | '5m' | '15m' | '1h' | '6h' | '1d';
export type LaneCompareMetric =
    | 'occupancies'
    | 'alarms'
    | 'alarmRate'
    | 'adjudicatedPct'
    | 'meanAdjTime';

/**
 * Only `visualization` and `lanes` are required — everything else is
 * optional-with-default (same approach as MapWidgetConfig). validatePageConfig
 * only checks that config is an object, so a config persisted before a field
 * existed still validates; every read must use `??` or it crashes on the
 * undefined. Keeping fields optional also means adding a new toggle later needs
 * no schema bump and no migration.
 */
export interface AlarmStatsWidgetConfig {
    visualization: AlarmStatsVisualization;
    lanes: LaneSelection;
    /** History window seeded over REST. Default '24h'. */
    window?: AlarmStatsWindow;
    /** Bucket width; 'auto' derives from the window. Default 'auto'. */
    bucket?: AlarmStatsBucket;

    // rate-trend
    showOccupancies?: boolean;
    showAlarms?: boolean;
    /** Alarm rate % on a right-hand axis. */
    showAlarmRate?: boolean;
    trendStyle?: 'line' | 'area';

    // adjudication-time
    showAdjMeanTrend?: boolean;

    // lane-comparison
    laneCompareMode?: 'bars' | 'kpis' | 'both';
    laneCompareMetric?: LaneCompareMetric;
    laneCompareTopN?: number;

    // lane-stack (alarms over time, stacked by lane)
    laneStackMetric?: 'alarms' | 'occupancies';
    /** Lanes drawn individually; the rest fold into "Other". Clamped to 7 so the stack stays readable. */
    laneStackTopN?: number;

    // time-profile (hour-of-day / day-of-week)
    profileAxis?: 'hourOfDay' | 'dayOfWeek';
    /**
     * Show the mean per hour/weekday rather than the raw total. Default true:
     * a window that doesn't cover whole weeks gives some bins more occurrences
     * than others, so raw totals misrepresent the shape.
     */
    profileNormalize?: boolean;

    /** Append live occupancies from the occRT streams. Default true. */
    liveAppend?: boolean;
    /** Re-seed cadence in seconds; 0 = manual refresh only. Default 300. */
    refreshSec?: number;
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
    | QuickViewWidgetConfig
    | AlarmStatsWidgetConfig;

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

/** Default/min widget sizes in grid units (lg 12-col basis, 8px rows / 16px steps). */
export const WIDGET_SIZES: Record<WidgetType, { defaultSize: { w: number, h: number }, minSize: { w: number, h: number } }> = {
    'system-status': {defaultSize: {w: 8, h: 15}, minSize: {w: 2, h: 7}},
    'map': {defaultSize: {w: 6, h: 24}, minSize: {w: 3, h: 12}},
    'event-table': {defaultSize: {w: 12, h: 24}, minSize: {w: 4, h: 11}},
    'adjudication-table': {defaultSize: {w: 12, h: 24}, minSize: {w: 4, h: 11}},
    'video': {defaultSize: {w: 4, h: 21}, minSize: {w: 2, h: 12}},
    'chart': {defaultSize: {w: 6, h: 15}, minSize: {w: 3, h: 9}},
    'national-stats': {defaultSize: {w: 12, h: 27}, minSize: {w: 6, h: 15}},
    'lane-detail-status': {defaultSize: {w: 12, h: 6}, minSize: {w: 4, h: 6}},
    'status-table': {defaultSize: {w: 12, h: 24}, minSize: {w: 4, h: 12}},
    'quick-view': {defaultSize: {w: 4, h: 39}, minSize: {w: 3, h: 18}},
    'alarm-stats': {defaultSize: {w: 6, h: 21}, minSize: {w: 3, h: 12}},
};

/**
 * Derived from WIDGET_SIZES rather than hand-listed: validatePageConfig drops
 * the *entire page* for an unknown widget type, so a type missing from this
 * list silently deletes the user's page on the next rehydrate. WIDGET_SIZES is
 * Record<WidgetType,...>, so the compiler keeps it exhaustive for us.
 */
export const KNOWN_WIDGET_TYPES: WidgetType[] = Object.keys(WIDGET_SIZES) as WidgetType[];

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
            return {lanes: {mode: 'all'}};
        case 'map':
            // Mobile fields are optional-with-defaults so persisted configs
            // from before this change stay valid without a schema bump
            return {
                lanes: {mode: 'all'},
                showMobileUnits: true,
                showTrail: true,
                trailLength: 300,
                showAlarmMarkers: true,
                alarmTimeWindow: 'today',
            };
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
        case 'alarm-stats':
            return {
                visualization: 'rate-trend',
                lanes: {mode: 'all'},
                window: '24h',
                bucket: 'auto',
                showOccupancies: true,
                showAlarms: true,
                showAlarmRate: true,
                trendStyle: 'area',
                showAdjMeanTrend: true,
                laneCompareMode: 'both',
                laneCompareMetric: 'alarmRate',
                laneCompareTopN: 15,
                laneStackMetric: 'alarms',
                laneStackTopN: 7,
                profileAxis: 'hourOfDay',
                profileNormalize: true,
                liveAppend: true,
                refreshSec: 300,
            };
    }
}
