"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';

export const reportTypes = [
    {
        label: "RDS Site Report",
        value: "rdsSite",
        description: "Total alarms, faults, occupancies, and statistics"
    },
    {
        label: "Lane Report",
        value: "lane",
        description: "Total alarms, faults, occupancies, and statistics"

    },
    {
        label: "Alarm Event Report",
        value: "alarmEvent",
        description: "Image, graphs, adjudication and statistics"

    },
    {
        label: "Event Report",
        value: "event",
        description: "Charts for lanes, faults, alarm types, and occupancies"
    },
    {
        label: "Operations Report",
        value: "operations",
        description: "Disposition, secondary inspections details and results"
    }
]

export default function ReportTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    reportTypeVal: string
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
                value={props.reportTypeVal}
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
