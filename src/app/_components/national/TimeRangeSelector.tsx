"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from 'react';
import {useLanguage} from "@/app/contexts/LanguageContext";

const timeRanges = [
    {
        labelKey: "allTime",
        value: "allTime",
    },
    {
        labelKey: "last30Days",
        value: "monthly",
    },
    {
        labelKey: "last7Days",
        value: 'weekly'
    },
    {
        labelKey: "last24Hours",
        value: "daily"
    },
    {
        labelKey: "customRange",
        value: "custom"
    }
]

export default function TimeRangeSelect(props: {
    onSelect: (value: string[] | string) => void,
    timeRange: string
}) {
    const {t} = useLanguage();

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
                fullWidth
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
                            {t(range.labelKey)}
                        </MenuItem>
                    ))
                }
            </Select>
        </FormControl>
    );
}
