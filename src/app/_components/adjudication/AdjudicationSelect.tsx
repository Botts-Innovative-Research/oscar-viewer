"use client";

import {FormControl, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useEffect, useState} from 'react';
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {IAdjudicationData} from "@/lib/data/oscar/adjudication/Adjudication";
import {useLanguage} from "@/app/contexts/LanguageContext";

export const colorCodes = {
    real: {color: "error.dark"},
    innocent: {color: "primary.dark"},
    false: {color: "success.dark"},
    other: {color: "text.primary"}
};

export default function AdjudicationSelect(props: {
    onSelect: (value: AdjudicationCode) => void, // Return selected value
    adjCode: AdjudicationCode
}) {
    const {t} = useLanguage();
    // const [adjudicated, setAdjudicated] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]); // Adjudication selected value
    const [style, setStyle] = useState(colorCodes.other.color); // Adjudicated button style based on selected value

    const handleChangeAdjCode = (event: SelectChangeEvent) => {
        let value: AdjudicationCode = AdjudicationCodes.getCodeObjByLabel(event.target.value);
        // setAdjudicated(value); // Set local adjudicated state
        props.onSelect(value); // Return selected value to parent component

        // Handle component styling
        if (value.group === "Real Alarm") {
            setStyle(colorCodes.real.color);
        } else if (value.group === "Innocent Alarm") {
            setStyle(colorCodes.innocent.color);
        } else if (value.group === "False Alarm") {
            setStyle(colorCodes.false.color);
        } else {
            setStyle(colorCodes.other.color);
        }
    };

    return (
        <FormControl size="small" fullWidth>
            <InputLabel id="label" sx={{"&.MuiInputLabel-root": {color: style}}}>{t('adjudicate')}</InputLabel>
            <Select
                variant="outlined"
                id="label"
                label={t('adjudicate')}
                value={props.adjCode.label}
                onChange={handleChangeAdjCode}
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
                    color: style,
                    "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: style,
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
                <ListSubheader>{t('realAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Real Alarm").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.real}>{code.label}</MenuItem>
                ))}

                <ListSubheader>{t('innocentAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Innocent Alarm").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.innocent}>{code.label}</MenuItem>
                ))}

                <ListSubheader>{t('falseAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("False Alarm").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.false}>{code.label}</MenuItem>
                ))}

                <ListSubheader>{t('testMaintenance')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Test/Maintenance").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.other}>{code.label}</MenuItem>
                ))}

                <ListSubheader>{t('tamperFault')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Tamper/Fault").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.other}>{code.label}</MenuItem>
                ))}

                <ListSubheader>{t('other')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Other").map((code) => (
                    <MenuItem key={code.code} value={code.label} sx={colorCodes.other}>{code.label}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
}
