"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useRef} from "react";
import {Box, Typography} from "@mui/material";
import {ScrollingBarChartCore, ScrollingChartHandle} from "@/app/_components/lane-view/ChartLane";
import {ChartWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {useResolvedLane} from "@/app/_components/layout/useResolvedLane";
import {useLaneStreams} from "@/lib/data/oscar/streams/useLaneStreams";
import {LaneStreamName} from "@/lib/data/oscar/streams/LaneStreamRegistry";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function ChartWidget({page, widget}: WidgetProps) {
    const config = widget.config as ChartWidgetConfig;
    const {t} = useLanguage();
    const lane = useResolvedLane(page, config.laneSource);
    const coreRef = useRef<ScrollingChartHandle>(null);

    const channel = config.channel ?? 'gamma';
    const isGamma = channel === 'gamma';
    const showThreshold = isGamma && (config.showThreshold ?? false);
    const dataField = isGamma ? 'gammaGrossCount' : 'neutronGrossCount';
    const countStream: LaneStreamName = isGamma ? 'gammaRT' : 'neutronRT';

    const streams: LaneStreamName[] = showThreshold ? [countStream, 'gammaTrshldRT'] : [countStream];

    useLaneStreams(
        {mode: 'include', lanes: lane ? [lane] : []},
        streams,
        (_laneId, stream, message) => {
            const rec = message.values?.[0];
            if (!rec) return;
            if (stream === 'gammaTrshldRT') {
                const val = rec.data?.threshold;
                if (val != null) coreRef.current?.setThreshold(val);
            } else {
                const value = rec.data?.[dataField];
                if (value != null) coreRef.current?.pushValue(value);
            }
        },
        !!lane,
    );

    if (!lane) {
        return (
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <Typography color="text.secondary">{t('noLaneSelected')}</Typography>
            </Box>
        );
    }

    return (
        <ScrollingBarChartCore
            key={lane}
            ref={coreRef}
            title={`${isGamma ? t('gammaChart') : t('neutronChart')} — ${lane}`}
            barColor={isGamma ? '#f44336' : '#29b6f6'}
            showThreshold={showThreshold}
            height="100%"
        />
    );
}
