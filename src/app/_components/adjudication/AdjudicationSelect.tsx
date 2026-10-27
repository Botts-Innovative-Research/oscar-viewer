"use client";

import {FormControl, FormHelperText, InputLabel, ListSubheader, MenuItem, Select, SelectChangeEvent} from '@mui/material';
import {useEffect, useState} from 'react';
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {INode} from "@/lib/data/osh/Node";
import {useCustomAdjudicationCodes} from "@/app/hooks/useCustomAdjudicationCodes";
import {useLanguage} from '@/app/contexts/LanguageContext';

export const colorCodes = {
    real: {color: "error.dark"},
    innocent: {color: "primary.dark"},
    false: {color: "success.dark"},
    other: {color: "text.primary"}
};

export default function AdjudicationSelect(props: {
    onSelect: (value: AdjudicationCode) => void, // Return selected value
    adjCode: AdjudicationCode,
    nodes?: INode[]
}) {
    const {t} = useLanguage();
    const {codes: customCodes, failed, loading, refresh} = useCustomAdjudicationCodes(props.nodes ?? []);
    const choices = [...AdjudicationCodes.codes, ...customCodes];
    const [style, setStyle] = useState(colorCodes.other.color); // Adjudicated button style based on selected value

    useEffect(() => {
        if (!loading && props.adjCode.code > 11 && !customCodes.some(code => code.code === props.adjCode.code))
            props.onSelect(AdjudicationCodes.codes[0]);
    }, [loading, customCodes, props.adjCode.code, props.onSelect]);

    const handleChangeAdjCode = (event: SelectChangeEvent) => {
        const value = choices.find(code => code.code === Number(event.target.value));
        if (!value) return;
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
                value={choices.some(code => code.code === props.adjCode.code) ? String(props.adjCode.code) : "0"}
                onOpen={refresh}
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
                <MenuItem value="0" disabled>{t("adjudicate")}</MenuItem>
                <ListSubheader>{t('realAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Real Alarm").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.real}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}

                <ListSubheader>{t('innocentAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Innocent Alarm").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.innocent}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}

                <ListSubheader>{t('falseAlarm')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("False Alarm").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.false}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}

                <ListSubheader>{t('alarmTamperFault')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Test/Maintenance").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.other}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}

                <ListSubheader>{t('tamperFault')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Tamper/Fault").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.other}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}

                <ListSubheader>{t('other')}</ListSubheader>
                {AdjudicationCodes.getGroupCodes("Other").map((code) => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.other}>{t(`adjudicationCode.${code.code}`)}</MenuItem>
                ))}
                {customCodes.length > 0 && <ListSubheader>{t("customDispositionCodes")}</ListSubheader>}
                {customCodes.map(code => (
                    <MenuItem key={code.code} value={String(code.code)} sx={colorCodes.other}>
                        {"Code " + code.code + ": " + code.label}
                    </MenuItem>
                ))}
            </Select>
            {failed && <FormHelperText error>{t("customDispositionCodesLoadFailed")}</FormHelperText>}
        </FormControl>
    );
}
