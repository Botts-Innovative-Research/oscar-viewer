"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";
import { useLanguage } from '@/contexts/LanguageContext';

export default function EventTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    event: string
}) {
    const { t } = useLanguage();

    const eventTypes = [
        {
            label: t('alarmsAndOccupancies'),
            value: "ALARMS_OCCUPANCIES",
        },
        {
            label: t('alarms'),
            value: "ALARMS",
        },
        {
            label: t('stateOfHealth'),
            value: "SOH",
        },
    ]

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">{t('eventType')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('eventType')}
                value= {props.event || ""}
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
