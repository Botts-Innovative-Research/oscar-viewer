"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {
    Box,
    Checkbox,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import LaneSelectionField from "./LaneSelectionField";
import {
    DEFAULT_EVENT_TABLE_COLUMNS,
    EventTableColumnSetting,
    EventTableWidgetConfig,
} from "@/lib/layout/PageConfigTypes";
import {WidgetConfigFormProps} from "@/app/_components/layout/WidgetTypes";
import {useLanguage} from "@/app/contexts/LanguageContext";

const STATUS_OPTIONS = ['Gamma', 'Neutron', 'Gamma & Neutron', 'None'];

/** i18n keys for column labels, matching the EventTable headers. */
const COLUMN_LABEL_KEYS: Record<string, string> = {
    laneId: 'laneId',
    occupancyCount: 'occupancyId',
    startTime: 'startTime',
    endTime: 'endTime',
    maxGamma: 'maxGamma',
    maxNeutron: 'maxNeutron',
    status: 'status',
    adjudicatedIds: 'adjudicated',
    adjudicationGroup: 'adjudicationStatus',
    secondaryInspection: 'secondaryInspection',
};

export default function EventTableConfigForm({draft, onChange}: WidgetConfigFormProps) {
    const config = draft as EventTableWidgetConfig;
    const {t} = useLanguage();

    const columns: EventTableColumnSetting[] = config.columns?.length
        ? config.columns
        : DEFAULT_EVENT_TABLE_COLUMNS.map((c) => ({...c}));
    const filters = config.filters ?? {lanes: {mode: 'all' as const}};

    const setColumns = (next: EventTableColumnSetting[]) => onChange({...config, columns: next});
    const setFilters = (next: EventTableWidgetConfig['filters']) => onChange({...config, filters: next});

    const moveColumn = (index: number, delta: number) => {
        const target = index + delta;
        if (target < 0 || target >= columns.length) return;
        const next = [...columns];
        [next[index], next[target]] = [next[target], next[index]];
        setColumns(next);
    };

    const toggleColumn = (index: number) => {
        const next = columns.map((c, i) => i === index ? {...c, visible: !c.visible} : c);
        setColumns(next);
    };

    return (
        <Stack spacing={2}>
            <Typography variant="subtitle2">{t('columns')}</Typography>
            <List dense disablePadding sx={{border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 260, overflowY: 'auto'}}>
                {columns.map((col, index) => (
                    <ListItem
                        key={col.key}
                        dense
                        secondaryAction={
                            <Box>
                                <IconButton edge="end" size="small" disabled={index === 0}
                                            onClick={() => moveColumn(index, -1)} aria-label="move up">
                                    <ArrowUpwardRoundedIcon fontSize="inherit"/>
                                </IconButton>
                                <IconButton edge="end" size="small" disabled={index === columns.length - 1}
                                            onClick={() => moveColumn(index, 1)} aria-label="move down">
                                    <ArrowDownwardRoundedIcon fontSize="inherit"/>
                                </IconButton>
                            </Box>
                        }
                    >
                        <Checkbox
                            size="small"
                            checked={col.visible}
                            onChange={() => toggleColumn(index)}
                        />
                        <ListItemText primary={t(COLUMN_LABEL_KEYS[col.key] ?? col.key)}/>
                    </ListItem>
                ))}
            </List>

            <Divider/>
            <Typography variant="subtitle2">{t('filters')}</Typography>

            <LaneSelectionField
                value={filters.lanes ?? {mode: 'all'}}
                onChange={(lanes) => setFilters({...filters, lanes})}
            />

            <FormControl size="small" fullWidth>
                <InputLabel id="status-filter-label">{t('status')}</InputLabel>
                <Select
                    labelId="status-filter-label"
                    label={t('status')}
                    multiple
                    value={filters.status ?? []}
                    onChange={(e) => {
                        const val = e.target.value;
                        const next = typeof val === 'string' ? val.split(',') : val;
                        setFilters({...filters, status: next.length === 0 ? undefined : next});
                    }}
                    renderValue={(vals) => (vals as string[]).length === 0 ? t('allStatuses') : (vals as string[]).join(', ')}
                    displayEmpty
                >
                    {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status}>
                            <Checkbox checked={(filters.status ?? []).includes(status)} size="small"/>
                            <ListItemText primary={status}/>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
                <InputLabel id="adjudicated-filter-label">{t('adjudicated')}</InputLabel>
                <Select
                    labelId="adjudicated-filter-label"
                    label={t('adjudicated')}
                    value={filters.adjudicated ?? 'any'}
                    onChange={(e) => setFilters({...filters, adjudicated: e.target.value as 'any' | 'yes' | 'no'})}
                >
                    <MenuItem value="any">{t('any')}</MenuItem>
                    <MenuItem value="yes">{t('yes')}</MenuItem>
                    <MenuItem value="no">{t('no')}</MenuItem>
                </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Stack direction="row" spacing={1}>
                    <DateTimePicker
                        label={t('startTime')}
                        value={filters.dateRange?.start ? dayjs(filters.dateRange.start) : null}
                        onChange={(value) => setFilters({
                            ...filters,
                            dateRange: {
                                ...filters.dateRange,
                                start: value?.isValid() ? value.toISOString() : undefined,
                            },
                        })}
                        slotProps={{textField: {size: 'small', fullWidth: true}}}
                    />
                    <DateTimePicker
                        label={t('endTime')}
                        value={filters.dateRange?.end ? dayjs(filters.dateRange.end) : null}
                        onChange={(value) => setFilters({
                            ...filters,
                            dateRange: {
                                ...filters.dateRange,
                                end: value?.isValid() ? value.toISOString() : undefined,
                            },
                        })}
                        slotProps={{textField: {size: 'small', fullWidth: true}}}
                    />
                </Stack>
            </LocalizationProvider>
        </Stack>
    );
}
