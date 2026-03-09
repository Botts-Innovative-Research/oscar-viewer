"use client";

import {FormControl, InputLabel, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useState} from "react";
import { useLanguage } from '@/contexts/LanguageContext';


export default function ReportTypeSelect(props: {
    onSelect: (value: string[] | string) => void,
    report: string
}) {
    const { t } = useLanguage();

    const reportTypes = [
        {
            label: t('rdsSiteReport'),
            value: "RDS_SITE",
        },
        {
            label: t('laneReport'),
            value: "LANE",
        },
        {
            label: t('adjudicationReport'),
            value: "ADJUDICATION",
        },
        {
            label: t('eventReport'),
            value: "EVENT",
        }
    ]

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label">{t('reportType')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('reportType')}
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
