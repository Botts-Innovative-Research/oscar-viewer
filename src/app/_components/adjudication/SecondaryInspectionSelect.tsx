"use client";

import {FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useEffect, useState} from 'react';
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {IAdjudicationData} from "@/lib/data/oscar/adjudication/Adjudication";
import { useLanguage } from '@/contexts/LanguageContext';

const secondarySelectChoices=[
    "NONE",
    "COMPLETED",
    "REQUESTED",
]
export default function SecondaryInspectionSelect(props: {
    onSelect: (value: string) => void, // Return selected value
    secondarySelectVal: string
}) {
    const { t } = useLanguage();

    const handleChange = (event: SelectChangeEvent) => {
        const val = event.target.value;
        props.onSelect(val)
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label" >{t('secondaryInspection')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('secondaryInspection')}
                value={props.secondarySelectVal}
                onChange={handleChange}
                MenuProps={{
                    MenuListProps: {
                        style: {
                            maxHeight: 300
                        }
                    }
                }}
                autoWidth
                style={{minWidth: "12em"}}
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
                {secondarySelectChoices.map((item) =>(
                    <MenuItem key={item} value={item}>
                        {item}
                    </MenuItem>
                ))
                }

            </Select>
        </FormControl>
    );
}
