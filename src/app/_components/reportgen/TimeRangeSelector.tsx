"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from 'react';

const timeRanges = [
    {
        label: "Last 24 Hours",
        value: "last24Hrs",

    },
    {
        label: "Last 7 Days",
        value: 'lasy7days'
    },
    {
        label: "Last 30 Days",
        value: 'last30days'
    },
    {
        label: "This Month",
        value: 'thisMonth'
    },
    {
        label: 'Custom Range',
        value: 'custom'
    }
]

export default function TimeRangeSelect(props: {
    onSelect: (value: string[] | string) => void,
    timeRangeVal: string
}) {


    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Time Range</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="TimeRange"
                value={props.timeRangeVal}
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
