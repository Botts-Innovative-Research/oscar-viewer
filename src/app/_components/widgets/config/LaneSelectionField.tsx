"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Switch,
} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {LaneSelection} from "@/lib/layout/PageConfigTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface LaneSelectionFieldProps {
    value: LaneSelection;
    onChange: (next: LaneSelection) => void;
}

/** "All lanes" toggle + lane multi-select, shared by widget config forms. */
export default function LaneSelectionField({value, onChange}: LaneSelectionFieldProps) {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const {t} = useLanguage();

    const laneNames: string[] = laneMap instanceof Map
        ? [...laneMap.keys()].sort((a, b) => a.localeCompare(b, undefined, {numeric: true}))
        : [];

    const allLanes = value.mode === 'all';
    const selected = value.mode === 'include' ? value.lanes : laneNames;

    return (
        <Stack spacing={1}>
            <FormControlLabel
                control={
                    <Switch
                        checked={allLanes}
                        onChange={(e) => onChange(e.target.checked
                            ? {mode: 'all'}
                            : {mode: 'include', lanes: laneNames})}
                    />
                }
                label={t('allLanes')}
            />
            {!allLanes && (
                <FormControl size="small" fullWidth>
                    <InputLabel id="lane-select-label">{t('lanes')}</InputLabel>
                    <Select
                        labelId="lane-select-label"
                        label={t('lanes')}
                        multiple
                        value={selected}
                        onChange={(e) => {
                            const next = typeof e.target.value === 'string'
                                ? e.target.value.split(',')
                                : e.target.value;
                            onChange({mode: 'include', lanes: next});
                        }}
                        renderValue={(vals) => (vals as string[]).join(', ')}
                    >
                        {laneNames.map((lane) => (
                            <MenuItem key={lane} value={lane}>
                                <Checkbox checked={selected.includes(lane)} size="small"/>
                                <ListItemText primary={lane}/>
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
        </Stack>
    );
}
