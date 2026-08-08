"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box, Paper, Stack, Typography} from "@mui/material";
import {AlarmStatsTotals} from "@/lib/data/oscar/stats/alarmStatsTypes";
import {formatDuration} from "@/lib/data/oscar/stats/formatDuration";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface Props {
    totals: AlarmStatsTotals;
}

function percent(value: number | null): string {
    return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function Tile({label, value}: { label: string; value: string }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                flex: 1,
                minWidth: 0,
                px: 1,
                py: 0.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <Typography variant="h6" noWrap sx={{lineHeight: 1.2}}>{value}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
        </Paper>
    );
}

/** Compact totals strip shown above the lane-comparison bars. */
export default function AlarmStatsKpiRow({totals}: Props) {
    const {t} = useLanguage();

    return (
        <Box sx={{flexShrink: 0, pb: 0.5}}>
            <Stack direction="row" spacing={0.5}>
                <Tile label={t('occupancies')} value={totals.occupancies.toLocaleString()}/>
                <Tile label={t('alarmRate')} value={percent(totals.alarmRate)}/>
                <Tile label={t('adjudicatedPct')} value={percent(totals.adjudicatedRate)}/>
                <Tile
                    label={t('meanAdjTime')}
                    value={totals.meanAdjSeconds == null ? "—" : formatDuration(totals.meanAdjSeconds)}
                />
            </Stack>
        </Box>
    );
}
