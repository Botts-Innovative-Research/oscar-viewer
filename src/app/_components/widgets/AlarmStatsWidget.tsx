"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useMemo} from "react";
import {Box, CircularProgress, LinearProgress, Typography, useTheme} from "@mui/material";
import {AlarmStatsWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {useAlarmStats} from "@/lib/data/oscar/stats/useAlarmStats";
import AlarmStatsChart from "./alarm-stats/AlarmStatsChart";
import AlarmStatsKpiRow from "./alarm-stats/AlarmStatsKpiRow";
import {
    buildAdjHistogramSpec,
    buildAdjTrendSpec,
    buildAlarmRateSpec,
    buildLaneComparisonSpec,
    buildLaneStackSpec,
    buildRateTrendSpec,
    buildTimeProfileSpec,
} from "./alarm-stats/chartSpecs";

function Centered({children, color = "text.secondary"}: { children: React.ReactNode; color?: string }) {
    return (
        <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 1}}>
            <Typography variant="body2" color={color} align="center">{children}</Typography>
        </Box>
    );
}

export default function AlarmStatsWidget({widget}: WidgetProps) {
    // Every field is read defensively: configs persisted before a field existed
    // still validate (validatePageConfig only checks that config is an object).
    const config = (widget.config ?? {}) as AlarmStatsWidgetConfig;
    const visualization = config.visualization ?? 'rate-trend';
    const {t} = useLanguage();
    const theme = useTheme();

    const showAdjTrend = config.showAdjMeanTrend ?? true;
    const laneMode = config.laneCompareMode ?? 'both';
    const laneMetric = config.laneCompareMetric ?? 'alarmRate';

    // Only views that actually display a latency number pay for the
    // control-stream fetch; rate-trend skips it entirely.
    const needAdjudication = visualization === 'adjudication-time'
        || (visualization === 'lane-comparison' && (
            // the KPI tiles include adjudicated % and mean adjudication time
            laneMode !== 'bars' || ['adjudicatedPct', 'meanAdjTime'].includes(laneMetric)
        ));

    const isProfile = visualization === 'time-profile';

    // 30d is only meaningful for the profile views (day-of-week needs several
    // samples per weekday) and would otherwise always trip the observation cap.
    // Clamp defensively so a config saved on the profile view and then switched
    // doesn't silently start a 30-day fetch.
    const rawWindow = config.window ?? '24h';
    const window = (rawWindow === '30d' && !isProfile) ? '7d' : rawWindow;

    // The profile folds buckets into hour-of-day / day-of-week bins, so buckets
    // must not be coarser than an hour or the binning is wrong. Force 1h rather
    // than trusting the user's bucket choice.
    const bucket = isProfile ? '1h' : (config.bucket ?? 'auto');

    const stats = useAlarmStats({
        lanes: config.lanes ?? {mode: 'all'},
        window,
        bucket,
        needAdjudication,
        liveAppend: config.liveAppend ?? true,
        refreshSec: config.refreshSec ?? 300,
    });

    const specs = useMemo(() => {
        switch (visualization) {
            case 'adjudication-time':
                return {
                    primary: buildAdjHistogramSpec(stats, theme, t),
                    secondary: showAdjTrend ? buildAdjTrendSpec(stats, theme, t) : null,
                };
            case 'lane-comparison':
                return {
                    primary: laneMode === 'kpis' ? null : buildLaneComparisonSpec(stats, config, theme, t),
                    secondary: null,
                };
            case 'lane-stack':
                return {primary: buildLaneStackSpec(stats, config, theme, t), secondary: null};
            case 'time-profile':
                return {primary: buildTimeProfileSpec(stats, config, theme, t), secondary: null};
            case 'rate-trend':
            default:
                return {
                    primary: buildRateTrendSpec(stats, config, theme, t),
                    // Alarm rate gets its own plot rather than a second y-axis:
                    // two y-scales on one plot invent a correlation out of how
                    // the scales happen to line up.
                    secondary: (config.showAlarmRate ?? true) ? buildAlarmRateSpec(stats, theme, t) : null,
                };
        }
        // stats.buckets is a fresh array on every publish and stable in between,
        // so it is exactly the right identity to rebuild specs on — the `stats`
        // object itself is re-spread on every render and would churn.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visualization, stats.buckets, theme.palette.mode, JSON.stringify(config), t]);

    if (stats.loading) {
        return (
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <CircularProgress size={24}/>
            </Box>
        );
    }

    if (stats.error) return <Centered color="error">{t('statsFetchFailed')}</Centered>;
    if (stats.laneCount === 0) return <Centered>{t('noLanesSelected')}</Centered>;
    if (stats.totals.occupancies === 0) return <Centered>{t('noStatsInWindow')}</Centered>;

    const showKpis = visualization === 'lane-comparison' && laneMode !== 'bars';
    // The adjudication histogram and its trend are co-equal plots (3:2); the
    // alarm-rate strip under the counts chart is a supporting read (4:2).
    const primaryFlex = visualization === 'rate-trend' ? 4 : 3;

    return (
        <Box sx={{height: '100%', width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0}}>
            {/* Background re-seed: a thin strip rather than blanking the chart. */}
            <Box sx={{height: 2, flexShrink: 0}}>
                {stats.refreshing && <LinearProgress sx={{height: 2}}/>}
            </Box>

            {showKpis && <AlarmStatsKpiRow totals={stats.totals}/>}

            {specs.primary && (
                <Box sx={{
                    flex: specs.secondary ? `${primaryFlex} 1 0` : '1 1 0',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <AlarmStatsChart spec={specs.primary}/>
                </Box>
            )}

            {/* Stacked rather than overlaid: the two plots measure different
                things (counts vs a percentage, or two different x domains), and
                sharing one plot would mean a second y-axis. */}
            {specs.secondary && (
                <Box sx={{flex: '2 1 0', minHeight: 0, display: 'flex', flexDirection: 'column'}}>
                    <AlarmStatsChart spec={specs.secondary}/>
                </Box>
            )}

            {stats.capped && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{flexShrink: 0, px: 0.5}}>
                    {`${t('alarmStatsCapped')} ${stats.fetchedCount.toLocaleString()} ${t('occupancies').toLowerCase()}`}
                </Typography>
            )}
        </Box>
    );
}
