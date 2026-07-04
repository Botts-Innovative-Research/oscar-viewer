"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {FormControl, InputLabel, MenuItem, Select} from "@mui/material";
import {NATIONAL_TIME_RANGES} from "@/app/_components/national/NationalStatsPanel";
import {NationalStatsWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function NationalStatsConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as NationalStatsWidgetConfig;
    const {t} = useLanguage();

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="time-range-label">{t('defaultTimeRange')}</InputLabel>
            <Select
                labelId="time-range-label"
                label={t('defaultTimeRange')}
                value={config.defaultTimeRange ?? 'allTime'}
                onChange={(e) => onChange({...config, defaultTimeRange: e.target.value})}
            >
                {NATIONAL_TIME_RANGES.filter((r) => r !== 'custom').map((range) => (
                    <MenuItem key={range} value={range}>{t(range)}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
