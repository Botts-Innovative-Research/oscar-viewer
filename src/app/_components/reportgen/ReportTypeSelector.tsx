"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";

export const reportTypes = [
    {
        label: "RDS Site Report",
        value: "RDS_SITE",
    },
    {
        label: "Lane Report",
        value: "LANE",
    },
    {
        label: "Adjudication Report",
        value: "ADJUDICATION",
    },
    {
        label: "Event Report",
        value: "EVENT",
    }
]

export default function ReportTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    report: string
}) {


    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Report Type</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Report Type"
                value= {props.report || ""}
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
                    reportTypes.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                            {item.label}
                        </MenuItem>
                    ))
                }
            </Select>
        </FormControl>
    );
}
