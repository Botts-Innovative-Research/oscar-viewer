"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";

export const reportTypes = [
    {
        label: "RDS Site Report",
        value: "rdsSite",
    },
    {
        label: "Lane Report",
        value: "lane",
    },
    {
        label: "Alarm Event Report",
        value: "alarmEvent",
    },
    {
        label: "Event Report",
        value: "event",
    },
    {
        label: "Operations Report",
        value: "operations",
    }
]

export default function ReportTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    reportTypeVal: string
}) {

    const [reportType, setReportType] = useState("");

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
        setReportType(val);
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Report Type</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Report Type"
                value= {reportType}
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
