import {Grid} from "@mui/material";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectEndDate, selectStartDate, setEndDate, setStartDate} from "@/lib/state/NationalViewSlice";
import React, {useState} from "react";
import dayjs, {Dayjs} from "dayjs";


export default function NationalDatePicker(){
    const dispatch = useDispatch();

    const savedStartDate = useSelector((state: RootState) => selectStartDate(state))
    const savedEndDate = useSelector((state: RootState) => selectEndDate(state))


    const [startTime, setStartTime] = useState<Dayjs>(dayjs(savedStartDate)); //dayjs().subtract(1, 'day')
    const [endTime, setEndTime] = useState<Dayjs>(dayjs(savedEndDate)); //dayjs

    const handleStartTimeChange = (newValue: Dayjs) => {
        setStartTime(newValue);
        dispatch(setStartDate(newValue.toISOString()))
        if(newValue && endTime && newValue.isAfter(endTime)){
            setEndTime(newValue)
            dispatch(setEndDate(newValue.toISOString()))
        }
    };

    const handleEndTimeChange = (newValue: Dayjs) => {
        if(startTime && newValue && newValue.isBefore(startTime)){
            return;
        }
        setEndTime(newValue);
        dispatch(setEndDate(newValue.toISOString()))

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