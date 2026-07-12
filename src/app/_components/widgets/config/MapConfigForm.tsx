"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {
    Divider,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import LaneSelectionField from "./LaneSelectionField";
import {MapAlarmWindow, MapWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

const ALARM_WINDOWS: MapAlarmWindow[] = ['today', '1h', '8h', '24h'];

export default function MapConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as MapWidgetConfig;
    const {t} = useLanguage();

    const showMobileUnits = config.showMobileUnits ?? true;
    const showTrail = config.showTrail ?? true;
    const trailLength = config.trailLength ?? 300;
    const showAlarmMarkers = config.showAlarmMarkers ?? true;
    const alarmTimeWindow = config.alarmTimeWindow ?? 'today';

    return (
        <Stack spacing={2}>
            <LaneSelectionField
                value={config.lanes ?? {mode: 'all'}}
                onChange={(lanes) => onChange({...config, lanes})}
            />
            <Divider/>
            <Typography variant="subtitle2">{t('mobileDetectors')}</Typography>
            <FormControlLabel
                control={<Switch checked={showMobileUnits}
                                 onChange={(e) => onChange({...config, showMobileUnits: e.target.checked})}/>}
                label={t('showMobileUnits')}
            />
            <FormControlLabel
                control={<Switch checked={showTrail} disabled={!showMobileUnits}
                                 onChange={(e) => onChange({...config, showTrail: e.target.checked})}/>}
                label={t('showTrail')}
            />
            <TextField
                label={t('trailLength')}
                type="number"
                size="small"
                disabled={!showMobileUnits || !showTrail}
                value={trailLength}
                inputProps={{min: 10, max: 3600}}
                onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) onChange({...config, trailLength: Math.max(10, Math.min(3600, v))});
                }}
            />
            <FormControlLabel
                control={<Switch checked={showAlarmMarkers} disabled={!showMobileUnits}
                                 onChange={(e) => onChange({...config, showAlarmMarkers: e.target.checked})}/>}
                label={t('showAlarmMarkers')}
            />
            <FormControl size="small" disabled={!showMobileUnits || !showAlarmMarkers}>
                <InputLabel id="map-alarm-window-label">{t('alarmTimeWindow')}</InputLabel>
                <Select
                    labelId="map-alarm-window-label"
                    label={t('alarmTimeWindow')}
                    value={alarmTimeWindow}
                    onChange={(e) => onChange({...config, alarmTimeWindow: e.target.value as MapAlarmWindow})}
                >
                    {ALARM_WINDOWS.map((w) => (
                        <MenuItem key={w} value={w}>{t(`alarmWindow_${w}`)}</MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
}
