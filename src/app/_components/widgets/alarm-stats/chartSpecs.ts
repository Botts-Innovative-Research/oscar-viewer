/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Theme} from "@mui/material";
import {alpha} from "@mui/material/styles";
import {AlarmStatsWidgetConfig, LaneCompareMetric} from "@/lib/layout/PageConfigTypes";
import {AlarmStatsSnapshot, ADJ_DEFAULT_BINS} from "@/lib/data/oscar/stats/alarmStatsTypes";
import {formatDuration} from "@/lib/data/oscar/stats/formatDuration";
import {buildLaneColorMap, MAX_LANE_SERIES, OTHER_COLOR} from "./categoricalPalette";

export type Translate = (key: string) => string;

/**
 * A category x-axis with pre-formatted labels is used throughout instead of
 * chart.js's time scale. The time scale needs a date adapter, and wiring
 * chartjs-adapter-moment would pull moment (~290KB) into the bundle — it is
 * currently only a transitive dependency that nothing in src/ imports. Our x
 * values are already uniform, dense, wall-clock-aligned bucket starts, so a
 * category axis is exactly equivalent. Same choice ChartLane makes.
 */
function bucketLabel(t: number, bucketMs: number): string {
    const d = new Date(t);
    const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    // Buckets of a day or more only need the date; anything finer needs the clock.
    if (bucketMs >= 24 * 60 * 60 * 1000) {
        return new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric'}).format(d);
    }
    if (bucketMs >= 60 * 60 * 1000) {
        return new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric', hour: 'numeric'}).format(d);
    }
    return new Intl.DateTimeFormat(locale, {hour: '2-digit', minute: '2-digit'}).format(d);
}

/** Compact duration for axis ticks and bin edges — "30s", "5m", "1h". */
function shortDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const h = seconds / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}h`;
}

/**
 * Bin edges use the compact form: the full formatDuration output ("5m 00s –
 * 10m 00s") collides on the category axis at normal widget widths.
 */
function binLabel(bins: number[], index: number): string {
    const lo = index === 0 ? 0 : bins[index - 1];
    const hi = bins[index];
    if (!Number.isFinite(hi)) return `> ${shortDuration(lo)}`;
    if (lo === 0) return `< ${shortDuration(hi)}`;
    return `${shortDuration(lo)}–${shortDuration(hi)}`;
}

/**
 * Chart colors and chrome from the MUI theme. Applied per-instance and never
 * via Chart.defaults, which is global and would leak into the four charts that
 * already exist (lane-view gamma/neutron, N42, RS350 playback).
 */
function chromeFor(theme: Theme) {
    return {
        tick: theme.palette.text.secondary,
        grid: theme.palette.divider,
        legend: theme.palette.text.primary,
        occupancy: theme.palette.info.main,
        alarm: theme.palette.error.main,
        rate: theme.palette.warning.main,
        neutral: theme.palette.primary.main,
    };
}

function baseOptions(theme: Theme) {
    const c = chromeFor(theme);
    return {
        animation: false as const,
        responsive: true,
        maintainAspectRatio: false,
        interaction: {mode: 'index' as const, intersect: false},
        plugins: {
            legend: {display: true, position: 'bottom' as const, labels: {color: c.legend, boxWidth: 12}},
            tooltip: {enabled: true},
        },
    };
}

function axis(theme: Theme, extra: any = {}) {
    const c = chromeFor(theme);
    const {ticks, grid, title, ...rest} = extra;
    return {
        ...rest,
        ticks: {color: c.tick, ...(ticks ?? {})},
        grid: {color: c.grid, ...(grid ?? {})},
        ...(title ? {title: {display: true, color: c.tick, ...title}} : {}),
    };
}

/** Occupancies + alarms per bucket. Alarm rate % is a separate plot — see buildAlarmRateSpec. */
export function buildRateTrendSpec(
    snapshot: AlarmStatsSnapshot,
    config: AlarmStatsWidgetConfig,
    theme: Theme,
    t: Translate,
): any {
    const c = chromeFor(theme);
    const showOcc = config.showOccupancies ?? true;
    const showAlarms = config.showAlarms ?? true;
    const fill = (config.trendStyle ?? 'area') === 'area';

    const labels = snapshot.buckets.map((b) => bucketLabel(b.t, snapshot.bucketMs));

    const datasets: any[] = [];
    if (showOcc) {
        datasets.push({
            type: 'line',
            label: t('occupancies'),
            data: snapshot.buckets.map((b) => b.occupancies),
            borderColor: c.occupancy,
            backgroundColor: alpha(c.occupancy, 0.25),
            fill,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
        });
    }
    if (showAlarms) {
        datasets.push({
            type: 'line',
            label: t('alarms'),
            data: snapshot.buckets.map((b) => b.alarms),
            borderColor: c.alarm,
            backgroundColor: alpha(c.alarm, 0.25),
            fill,
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.25,
        });
    }
    return {
        type: 'bar',
        data: {labels, datasets},
        options: {
            ...baseOptions(theme),
            scales: {
                x: axis(theme, {ticks: {maxTicksLimit: 8, maxRotation: 0, autoSkip: true}}),
                y: axis(theme, {beginAtZero: true, title: {text: t('count')}}),
            },
        },
    };
}

/**
 * Alarm rate % over time, as its own plot.
 *
 * Deliberately NOT a second y-axis on the counts chart: two y-scales on one
 * plot let the reader infer a correlation that is an artifact of how the two
 * scales happen to be aligned. Counts and a percentage are different measures,
 * so they get different plots sharing one x-axis.
 */
export function buildAlarmRateSpec(snapshot: AlarmStatsSnapshot, theme: Theme, t: Translate): any {
    const c = chromeFor(theme);
    return {
        type: 'line',
        data: {
            labels: snapshot.buckets.map((b) => bucketLabel(b.t, snapshot.bucketMs)),
            datasets: [{
                label: t('alarmRatePct'),
                // A bucket with no occupancies gets null, never 0 — rendering
                // 0/0 as "0% alarmed" would misdescribe a period with no traffic.
                data: snapshot.buckets.map((b) => (b.occupancies > 0 ? (b.alarms / b.occupancies) * 100 : null)),
                borderColor: c.rate,
                backgroundColor: alpha(c.rate, 0.2),
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true,
                tension: 0.25,
                fill: true,
            }],
        },
        options: {
            ...baseOptions(theme),
            plugins: {...baseOptions(theme).plugins, legend: {display: false}},
            scales: {
                x: axis(theme, {ticks: {maxTicksLimit: 8, maxRotation: 0, autoSkip: true}}),
                y: axis(theme, {
                    beginAtZero: true,
                    title: {text: t('alarmRatePct')},
                    ticks: {callback: (v: any) => `${v}%`},
                }),
            },
        },
    };
}

/** Histogram of time-to-adjudicate across the window. */
export function buildAdjHistogramSpec(snapshot: AlarmStatsSnapshot, theme: Theme, t: Translate): any {
    const c = chromeFor(theme);
    const bins = ADJ_DEFAULT_BINS;
    const counts = new Array(bins.length).fill(0);

    for (const seconds of snapshot.adjSamplesSec) {
        const idx = bins.findIndex((upper) => seconds < upper);
        counts[idx >= 0 ? idx : bins.length - 1]++;
    }

    return {
        type: 'bar',
        data: {
            labels: bins.map((_, i) => binLabel(bins, i)),
            datasets: [{
                label: t('adjudications'),
                data: counts,
                backgroundColor: alpha(c.neutral, 0.6),
                borderColor: c.neutral,
                borderWidth: 1,
            }],
        },
        options: {
            ...baseOptions(theme),
            plugins: {...baseOptions(theme).plugins, legend: {display: false}},
            scales: {
                // autoSkip stays off: every bin must be visible for a histogram
                // to be readable, so let chart.js rotate rather than drop them.
                x: axis(theme, {
                    ticks: {autoSkip: false, maxRotation: 45, minRotation: 0},
                    title: {text: t('timeToAdjudicate')},
                }),
                y: axis(theme, {beginAtZero: true, title: {text: t('adjudications')}}),
            },
        },
    };
}

/** Mean time-to-adjudicate per bucket, over the same time axis as the trend chart. */
export function buildAdjTrendSpec(snapshot: AlarmStatsSnapshot, theme: Theme, t: Translate): any {
    const c = chromeFor(theme);
    return {
        type: 'line',
        data: {
            labels: snapshot.buckets.map((b) => bucketLabel(b.t, snapshot.bucketMs)),
            datasets: [{
                label: t('meanAdjTime'),
                // Buckets with no adjudications are gaps, not zeros.
                data: snapshot.buckets.map((b) => (b.adjSecondsCount > 0 ? b.adjSecondsSum / b.adjSecondsCount : null)),
                borderColor: c.rate,
                backgroundColor: alpha(c.rate, 0.2),
                borderWidth: 2,
                pointRadius: 0,
                spanGaps: true,
                tension: 0.25,
                fill: true,
            }],
        },
        options: {
            ...baseOptions(theme),
            scales: {
                x: axis(theme, {ticks: {maxTicksLimit: 8, maxRotation: 0, autoSkip: true}}),
                y: axis(theme, {
                    beginAtZero: true,
                    // formatDuration renders 0 as an em dash ("no data"), which
                    // is wrong for an axis origin.
                    ticks: {callback: (v: any) => (Number(v) === 0 ? '0s' : shortDuration(Number(v)))},
                }),
            },
        },
    };
}

export function laneMetricValue(row: {
    occupancies: number;
    alarms: number;
    adjudicated: number;
    adjSecondsSum: number;
    adjSecondsCount: number;
}, metric: LaneCompareMetric): number {
    switch (metric) {
        case 'occupancies':
            return row.occupancies;
        case 'alarms':
            return row.alarms;
        case 'alarmRate':
            return row.occupancies > 0 ? (row.alarms / row.occupancies) * 100 : 0;
        case 'adjudicatedPct':
            // Share of occupancies, matching LaneStatsTable and the server's
            // numAdjudicated — non-alarm occupancies get adjudicated too.
            return row.occupancies > 0 ? (row.adjudicated / row.occupancies) * 100 : 0;
        case 'meanAdjTime':
            return row.adjSecondsCount > 0 ? row.adjSecondsSum / row.adjSecondsCount : 0;
        default:
            return 0;
    }
}

const PERCENT_METRICS: LaneCompareMetric[] = ['alarmRate', 'adjudicatedPct'];

/** Horizontal bar ranking lanes by the selected metric. */
export function buildLaneComparisonSpec(
    snapshot: AlarmStatsSnapshot,
    config: AlarmStatsWidgetConfig,
    theme: Theme,
    t: Translate,
): any {
    const c = chromeFor(theme);
    const metric = config.laneCompareMetric ?? 'alarmRate';
    const topN = config.laneCompareTopN ?? 15;
    const isPercent = PERCENT_METRICS.includes(metric);
    const isDuration = metric === 'meanAdjTime';

    // Lane labels are laneMap keys (display names). Because we aggregate
    // client-side we never see a lane system UID, so unlike NationalStatsPanel
    // there is nothing to resolve through laneDisplayName.
    const rows = [...snapshot.byLane]
        .map((r) => ({label: r.laneId, value: laneMetricValue(r, metric)}))
        .sort((a, b) => b.value - a.value)
        .slice(0, Math.max(1, topN));

    const tickCallback = isPercent
        ? (v: any) => `${Number(v).toFixed(0)}%`
        : isDuration
            ? (v: any) => formatDuration(Number(v))
            : undefined;

    return {
        type: 'bar',
        data: {
            labels: rows.map((r) => r.label),
            datasets: [{
                label: t(`laneMetric_${metric}`),
                data: rows.map((r) => r.value),
                backgroundColor: alpha(metric === 'occupancies' ? c.occupancy : c.alarm, 0.6),
                borderColor: metric === 'occupancies' ? c.occupancy : c.alarm,
                borderWidth: 1,
            }],
        },
        options: {
            ...baseOptions(theme),
            indexAxis: 'y' as const,
            plugins: {
                ...baseOptions(theme).plugins,
                legend: {display: false},
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => (isDuration
                            ? formatDuration(ctx.parsed.x)
                            : isPercent
                                ? `${Number(ctx.parsed.x).toFixed(1)}%`
                                : String(ctx.parsed.x)),
                    },
                },
            },
            scales: {
                x: axis(theme, {beginAtZero: true, ticks: tickCallback ? {callback: tickCallback} : {}}),
                y: axis(theme, {grid: {display: false}}),
            },
        },
    };
}

/**
 * Alarms (or occupancies) over time, stacked by lane.
 *
 * Lanes past the top-N fold into a single grey "Other" rather than getting
 * generated hues: past eight categorical slots the colors stop being reliably
 * distinguishable, especially under colorblind simulation.
 */
export function buildLaneStackSpec(
    snapshot: AlarmStatsSnapshot,
    config: AlarmStatsWidgetConfig,
    theme: Theme,
    t: Translate,
): any {
    const metric = config.laneStackMetric ?? 'alarms';
    const topN = Math.min(Math.max(1, config.laneStackTopN ?? MAX_LANE_SERIES), MAX_LANE_SERIES);
    const surface = theme.palette.background.paper;

    const seriesOf = (s: { occupancies: number[]; alarms: number[] }) =>
        (metric === 'occupancies' ? s.occupancies : s.alarms);

    // Color is keyed to the lane itself, over the full selection — so a lane
    // that drops out of the top-N (or back into it) never repaints the others.
    const colorMap = buildLaneColorMap(
        snapshot.laneSeries.map((s) => s.laneId),
        theme.palette.mode === 'dark' ? 'dark' : 'light',
    );

    const ranked = [...snapshot.laneSeries]
        .map((s) => ({s, total: seriesOf(s).reduce((a, b) => a + b, 0)}))
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total);

    const shown = ranked.slice(0, topN);
    const rest = ranked.slice(topN);

    const datasets: any[] = shown.map(({s}) => ({
        label: s.laneId,
        data: seriesOf(s),
        backgroundColor: colorMap.get(s.laneId),
        // A 2px gap in the surface color separates stacked segments without
        // drawing an outline around them.
        borderColor: surface,
        borderWidth: {top: 2, right: 0, bottom: 0, left: 0},
        stack: 'lanes',
    }));

    if (rest.length > 0) {
        const merged = new Array(snapshot.buckets.length).fill(0);
        for (const {s} of rest) {
            const vals = seriesOf(s);
            for (let i = 0; i < merged.length; i++) merged[i] += vals[i] ?? 0;
        }
        datasets.push({
            label: `${t('otherLanes')} (${rest.length})`,
            data: merged,
            backgroundColor: OTHER_COLOR,
            borderColor: surface,
            borderWidth: {top: 2, right: 0, bottom: 0, left: 0},
            stack: 'lanes',
        });
    }

    return {
        type: 'bar',
        data: {labels: snapshot.buckets.map((b) => bucketLabel(b.t, snapshot.bucketMs)), datasets},
        options: {
            ...baseOptions(theme),
            scales: {
                x: axis(theme, {stacked: true, ticks: {maxTicksLimit: 8, maxRotation: 0, autoSkip: true}}),
                y: axis(theme, {
                    stacked: true,
                    beginAtZero: true,
                    title: {text: metric === 'occupancies' ? t('occupancies') : t('alarms')},
                }),
            },
        },
    };
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun; Date.getDay() is Sun=0

/**
 * Occupancies and alarms binned by hour-of-day or day-of-week.
 *
 * Re-aggregated from the existing time buckets, so it costs no extra fetching.
 * Both series are plain counts on one shared scale — alarms simply sit lower
 * than occupancies, which is the honest relationship.
 */
export function buildTimeProfileSpec(
    snapshot: AlarmStatsSnapshot,
    config: AlarmStatsWidgetConfig,
    theme: Theme,
    t: Translate,
): any {
    const c = chromeFor(theme);
    const axisMode = config.profileAxis ?? 'hourOfDay';
    const normalize = config.profileNormalize ?? true;
    const surface = theme.palette.background.paper;
    const locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

    const binCount = axisMode === 'hourOfDay' ? 24 : 7;
    const occ = new Array(binCount).fill(0);
    const alm = new Array(binCount).fill(0);
    // How many buckets landed in each bin — this is what makes normalization
    // exact even when the window covers a partial number of days/weeks.
    const bucketsIn = new Array(binCount).fill(0);

    for (const b of snapshot.buckets) {
        const d = new Date(b.t);
        const idx = axisMode === 'hourOfDay' ? d.getHours() : WEEKDAY_ORDER.indexOf(d.getDay());
        if (idx < 0) continue;
        occ[idx] += b.occupancies;
        alm[idx] += b.alarms;
        bucketsIn[idx]++;
    }

    // One "occurrence" is one calendar hour (hour-of-day) or one calendar day
    // (day-of-week). Deriving it from the bucket count rather than from the
    // window length means a capped or partial window still normalizes correctly.
    const msPerOccurrence = axisMode === 'hourOfDay' ? 3_600_000 : 86_400_000;
    const bucketsPerOccurrence = Math.max(1, msPerOccurrence / snapshot.bucketMs);
    // A bin the window never covered is a gap, not a zero: drawing 0 would
    // claim "no traffic on Sundays" when the truth is "no Sunday in range".
    const scale = (v: number, i: number): number | null => {
        if (bucketsIn[i] === 0) return null;
        if (!normalize) return v;
        return v / (bucketsIn[i] / bucketsPerOccurrence);
    };

    const labels = axisMode === 'hourOfDay'
        ? Array.from({length: 24}, (_, h) =>
            new Intl.DateTimeFormat(locale, {hour: 'numeric'}).format(new Date(2026, 0, 1, h)))
        : WEEKDAY_ORDER.map((wd) =>
            new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(new Date(2026, 0, 4 + wd)));

    const round = (v: number | null) => (v == null ? null : (normalize ? Math.round(v * 10) / 10 : v));
    const occData = occ.map((v, i) => round(scale(v, i)));
    const almData = alm.map((v, i) => round(scale(v, i)));
    // A null bin means the window never covered that hour/weekday. It renders
    // as an empty slot, which reads as "zero traffic" without an explanation —
    // say so in a subtitle whenever any bin lacks coverage.
    const hasUncovered = occData.some((v) => v === null);

    return {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: t('occupancies'),
                    data: occData,
                    backgroundColor: c.occupancy,
                    borderColor: surface,
                    borderWidth: {top: 0, right: 2, bottom: 0, left: 2},
                },
                {
                    label: t('alarms'),
                    data: almData,
                    backgroundColor: c.alarm,
                    borderColor: surface,
                    borderWidth: {top: 0, right: 2, bottom: 0, left: 2},
                },
            ],
        },
        options: {
            ...baseOptions(theme),
            plugins: {
                ...baseOptions(theme).plugins,
                ...(hasUncovered ? {
                    subtitle: {
                        display: true,
                        text: t('profileNoCoverage'),
                        color: c.tick,
                        font: {size: 11},
                        padding: {top: 2, bottom: 6},
                    },
                } : {}),
            },
            scales: {
                x: axis(theme, {
                    ticks: {autoSkip: true, maxRotation: 0},
                    title: {text: axisMode === 'hourOfDay' ? t('hourOfDay') : t('dayOfWeek')},
                }),
                y: axis(theme, {
                    beginAtZero: true,
                    title: {
                        text: normalize
                            ? (axisMode === 'hourOfDay' ? t('avgPerHour') : t('avgPerDay'))
                            : t('count'),
                    },
                }),
            },
        },
    };
}

export {bucketLabel, binLabel};
