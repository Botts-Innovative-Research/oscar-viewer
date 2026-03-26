import {Grid, Stack} from "@mui/material";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import React, {useEffect, useState} from "react";
import dayjs, {Dayjs} from "dayjs";
import { useLanguage } from '@/contexts/LanguageContext';


export default function NationalDatePicker({onCustomStartChange, onCustomEndChange }: {
    onCustomStartChange?: (value: string) => void,
    onCustomEndChange?: (value: string) => void,
}){
    const { t } = useLanguage();

    const [startTime, setStartTime] = useState<Dayjs>(dayjs().subtract(1, 'year'));
    const [endTime, setEndTime] = useState<Dayjs>(dayjs().add(1, 'hour'));

    const handleStartTimeChange = (newValue: Dayjs) => {
        if (!newValue) return;

        setStartTime(newValue);

        if(newValue && endTime && newValue.isAfter(endTime))
            setEndTime(newValue)

        onCustomStartChange?.(newValue.toDate().toISOString());
    };

    const handleEndTimeChange = (newValue: Dayjs) => {
        if (!newValue) return;

        if(startTime && newValue && newValue.isBefore(startTime))
            return;

        setEndTime(newValue);
        onCustomEndChange?.(newValue.toDate().toISOString());
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={2}>
                <DateTimePicker
                    label={t('startDate')}
                    value={startTime}
                    onChange={handleStartTimeChange}
                />
                <DateTimePicker
                    label={t('endDate')}
                    value={endTime}
                    onChange={handleEndTimeChange}
                />
            </Stack>
        </LocalizationProvider>
    )
}