"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {FormControl, InputLabel, MenuItem, Select, Stack} from "@mui/material";
import LaneSourceField from "./LaneSourceField";
import {StatusTableWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function StatusTableConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as StatusTableWidgetConfig;
    const {t} = useLanguage();

    return (
        <Stack spacing={2}>
            <LaneSourceField
                value={config.laneSource ?? {source: 'page'}}
                onChange={(laneSource) => onChange({...config, laneSource})}
            />
            <FormControl size="small" fullWidth>
                <InputLabel id="status-view-label">{t('defaultView')}</InputLabel>
                <Select
                    labelId="status-view-label"
                    label={t('defaultView')}
                    value={config.defaultView ?? 'occupancy'}
                    onChange={(e) => onChange({...config, defaultView: e.target.value as 'occupancy' | 'fault'})}
                >
                    <MenuItem value="occupancy">{t('occupancyTable')}</MenuItem>
                    <MenuItem value="fault">{t('faultTable')}</MenuItem>
                </Select>
            </FormControl>
        </Stack>
    );
}
