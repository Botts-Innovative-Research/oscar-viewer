"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";

export const eventTypes = [
    {
        label: "Lane",
        value: "lane",
    },
    {
        label: "State of Health",
        value: "soh",
    },
    {
        label: "Alarm Type",
        value: "alarmType",
    },
    {
        label: "Occupancy",
        value: "occupancy",
    }
]

export default function EventTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    eventVal: string
}) {

    const [eventType, setEventType] = useState("");

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
        setEventType(val);
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">Event Type</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label="Event Type"
                value= {eventType}
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
                    eventTypes.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                            {item.label}
                        </MenuItem>
                    ))
                }
            </Select>
        </FormControl>
    );
}
