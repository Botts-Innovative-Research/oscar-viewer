import {Grid} from "@mui/material";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";

import {RootState} from "@/lib/state/Store";
import {selectEndDate, selectStartDate, setEndDate, setStartDate} from "@/lib/state/NationalViewSlice";

import React, {useEffect, useState} from "react";
import dayjs, {Dayjs} from "dayjs";


export default function NationalDatePicker({onCustomRangeChange, customStartTime, customEndTime}: {
    onCustomRangeChange?: (range: { start: Date, end: Date }) => void,
    customStartTime?:Date,
    customEndTime?: Date
}){

    const [startTime, setStartTime] = useState<Dayjs>();
    const [endTime, setEndTime] = useState<Dayjs>();


    useEffect(() => {
        setStartTime(dayjs().subtract(1, 'year'));
        setEndTime(dayjs().add(1, 'hour'));
    }, []);

    const handleStartTimeChange = (newValue: Dayjs) => {
        setStartTime(newValue);
        if(newValue && endTime && newValue.isAfter(endTime)){
            setEndTime(newValue)
        }
        customStartTime = newValue.toDate();
    };

    const handleEndTimeChange = (newValue: Dayjs) => {
        if(startTime && newValue && newValue.isBefore(startTime)){
            return;
        }
        setEndTime(newValue);
        customEndTime = newValue.toDate();

    };

    return (
        <Grid container direction={"row"} padding={1} spacing={1}>
            <Grid item>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker label="Start Date" value={startTime} onChange={handleStartTimeChange}/>
                </LocalizationProvider>
            </Grid>
            <Grid item>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker label="End Date" value={endTime} onChange={handleEndTimeChange}/>
                </LocalizationProvider>
            </Grid>
        </Grid>
    )

}