"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack} from "@mui/material";
import LaneSourceField from "./LaneSourceField";
import {ChartWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function ChartConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as ChartWidgetConfig;
    const {t} = useLanguage();

    return (
        <Stack spacing={2}>
            <LaneSourceField
                value={config.laneSource ?? {source: 'page'}}
                onChange={(laneSource) => onChange({...config, laneSource})}
            />
            <FormControl size="small" fullWidth>
                <InputLabel id="chart-channel-label">{t('channel')}</InputLabel>
                <Select
                    labelId="chart-channel-label"
                    label={t('channel')}
                    value={config.channel ?? 'gamma'}
                    onChange={(e) => onChange({...config, channel: e.target.value as 'gamma' | 'neutron'})}
                >
                    <MenuItem value="gamma">{t('gammaChart')}</MenuItem>
                    <MenuItem value="neutron">{t('neutronChart')}</MenuItem>
                </Select>
            </FormControl>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={(config.channel ?? 'gamma') === 'gamma' && (config.showThreshold ?? false)}
                        disabled={(config.channel ?? 'gamma') !== 'gamma'}
                        onChange={(e) => onChange({...config, showThreshold: e.target.checked})}
                    />
                }
                label={t('showThreshold')}
            />
        </Stack>
    );
}
