/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {AlarmStatsBucket, AlarmStatsWindow} from "@/lib/layout/PageConfigTypes";

/** One time bucket. Counts are aggregated across every selected lane. */
export interface AlarmStatsBucketRow {
    /** Bucket start, epoch ms, wall-clock aligned. */
    t: number;
    occupancies: number;
    gammaAlarms: number;
    neutronAlarms: number;
    /** gammaAlarm || neutronAlarm — an occupancy counts once however it alarmed. */
    alarms: number;
    adjudicated: number;
    adjSecondsSum: number;
    adjSecondsCount: number;
}

/** One lane's counts per bucket, index-aligned with `buckets`. */
export interface AlarmStatsLaneSeries {
    laneId: string;
    occupancies: number[];
    alarms: number[];
}

/** Per-lane totals over the whole window. */
export interface AlarmStatsLaneRow {
    /** laneMap key, i.e. the lane display name — never a system UID. */
    laneId: string;
    occupancies: number;
    alarms: number;
    adjudicated: number;
    adjSecondsSum: number;
    adjSecondsCount: number;
}

export interface AlarmStatsTotals {
    occupancies: number;
    alarms: number;
    adjudicated: number;
    /** 0..1; null when there were no occupancies to divide by. */
    alarmRate: number | null;
    adjudicatedRate: number | null;
    meanAdjSeconds: number | null;
}

export interface AlarmStatsSnapshot {
    /** Ascending by t, dense (zero-filled). */
    buckets: AlarmStatsBucketRow[];
    byLane: AlarmStatsLaneRow[];
    /** Per-lane counts per bucket, for the stacked-by-lane view. */
    laneSeries: AlarmStatsLaneSeries[];
    totals: AlarmStatsTotals;
    /** Individual time-to-adjudicate samples, for the histogram. */
    adjSamplesSec: number[];
    windowStartMs: number;
    windowEndMs: number;
    bucketMs: number;
    /** True only for the first seed; a background re-seed sets `refreshing`. */
    loading: boolean;
    refreshing: boolean;
    /** OBS_CAP was hit — only the most recent `fetchedCount` observations are represented. */
    capped: boolean;
    fetchedCount: number;
    error: string | null;
}

/**
 * How the window is seeded.
 * - 'observations': paginate the occupancy observations (rich per-row data:
 *   per-lane series, adjudication join, live append) but subject to OBS_CAP.
 * - 'counts': one /observations/count per interval (~0.02s each) — totals
 *   only, but uncapped, so a 30d window gets full coverage. Used by the
 *   time-profile view, which only needs per-bin totals.
 */
export type AlarmStatsSeedMode = 'observations' | 'counts';

export interface AlarmStatsResult extends AlarmStatsSnapshot {
    /** Lanes the selection actually resolved to; 0 means "nothing to show". */
    laneCount: number;
    refresh: () => void;
}

export const WINDOW_SPAN_MS: Record<AlarmStatsWindow, number> = {
    '1h': 60 * 60 * 1000,
    '8h': 8 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

export const BUCKET_MS: Record<Exclude<AlarmStatsBucket, 'auto'>, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
};

/**
 * Auto bucket widths, chosen to keep the bucket count in 60..170 so a
 * 300-900px canvas always has >=2px per category and chart.js never needs
 * decimation.
 */
export const AUTO_BUCKET_MS: Record<AlarmStatsWindow, number> = {
    '1h': BUCKET_MS['1m'],    // 60 buckets
    '8h': BUCKET_MS['5m'],    // 96
    '24h': BUCKET_MS['15m'],  // 96
    '7d': BUCKET_MS['1h'],    // 168
    '30d': BUCKET_MS['6h'],   // 120
};

export function resolveBucketMs(window: AlarmStatsWindow, bucket: AlarmStatsBucket): number {
    if (bucket === 'auto' || !bucket) return AUTO_BUCKET_MS[window] ?? AUTO_BUCKET_MS['24h'];
    return BUCKET_MS[bucket] ?? AUTO_BUCKET_MS[window] ?? AUTO_BUCKET_MS['24h'];
}

/** Histogram bin upper edges in seconds. Code-side so they can be retuned without touching persisted config. */
export const ADJ_DEFAULT_BINS: number[] = [30, 60, 120, 300, 600, 1800, 3600, Infinity];

/**
 * Ceiling on observations pulled per seed, across all lanes. Measured on the
 * reference node: a 7d window is ~16k observations / ~10.5MB, so 20k fits a
 * normal site whole while a much busier one truncates rather than hanging the
 * tab. Spent round-robin so one chatty lane cannot starve the others.
 */
export const OBS_CAP = 20_000;
/** The per-datastream route serves 1000 observations in ~0.3s; Collection self-terminates on a short page. */
export const PAGE_SIZE = 1000;
/** Lanes fetched concurrently. Sequential serializes badly past ~10 lanes; unbounded opens 50 sockets at one Jetty. */
export const POOL = 4;
/** Adjudication statuses pulled per lane per page. */
export const ADJ_PAGE_SIZE = 1000;
/** Keep a released entry warm this long so nav-away-and-back doesn't re-fetch. */
export const CACHE_TTL_MS = 60_000;

export const EMPTY_TOTALS: AlarmStatsTotals = {
    occupancies: 0,
    alarms: 0,
    adjudicated: 0,
    alarmRate: null,
    adjudicatedRate: null,
    meanAdjSeconds: null,
};
