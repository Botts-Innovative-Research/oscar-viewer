"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TimeRangeSelect(props: {
    onSelect: (value: string[] | string) => void,
    timeRange: string
}) {
    const { t } = useLanguage();

    const timeRanges = [
        {
            label: t('last24Hours'),
            value: "last24Hrs",

        },
        {
            label: t('last7Days'),
            value: 'last7days'
        },
        {
            label: t('last30Days'),
            value: 'last30days'
        },
        {
            label: t('thisMonth'),
            value: 'thisMonth'
        },
        {
            label: t('customRange'),
            value: 'custom'
        }
    ]

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">{t('timeRange')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('timeRange')}
                value={props.timeRange}
                onChange={handleChange}
                MenuProps={{
                    MenuListProps: {
                        style: {
                            maxHeight: 300
                        }
                    }
                }}
                autoWidth
                style={{minWidth: "8em"}}
                sx={{
                    color: "text.primary",
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "inherit",
                    },
                    "&.MuiOutlinedInput-notchedOutline": {border: 1},
                    "&.MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                            borderRadius: "10px"
                        },
                    "&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                        {
                            border: 2,
                        },
                }}
            >
                {
                    timeRanges.map((range) => (
                        <MenuItem key={range.value} value={range.value}>
                            {range.label}
                        </MenuItem>
                    ))
                }
            </Select>
        </FormControl>
    );
}
