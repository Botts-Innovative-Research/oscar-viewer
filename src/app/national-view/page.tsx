"use client";

import {Box, FormControl, Grid, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Typography} from "@mui/material";
import StatTable from "../_components/national/StatTable";
import {useState} from "react";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, {Dayjs} from "dayjs";


export default function NationalViewPage() {

    //todo: add functionality for user to select time from 1 day , 1 week,  1 month

    // const defaultStartTime = dayjs();
    // const defaultEndTime = 'day';
    // const defaultStartTime = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const [startTime, setStartTime] = useState<Dayjs>(dayjs);
    const [endTime, setEndTime] = useState<Dayjs>(dayjs);

    const handleStartTimeChange = (newValue: Dayjs) => {
        setStartTime(newValue);
        if(newValue && endTime && newValue.isAfter(endTime)){
            setEndTime(newValue)
        }
    };

    const handleEndTimeChange = (newValue: Dayjs) => {
        if(startTime && newValue && newValue.isBefore(startTime)){
            return;
        }
        setEndTime(newValue);
    };

    return (

        <Box>
            <Typography variant="h4">National View</Typography>
            <br/>
            <Grid container direction={"row"} padding={1} spacing={1}>
                <Grid item>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DateTimePicker label="Start Date" value={startTime} onChange={handleStartTimeChange}/>
                        {/*<DateTimePicker label="End Date" value={endTime} onChange={handleEndTimeChange}/>*/}
                    </LocalizationProvider>
                </Grid>
                <Grid item>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        {/*<DateTimePicker label="Start Date" value={startTime} onChange={handleStartTimeChange}/>*/}
                        <DateTimePicker label="End Date" value={endTime} onChange={handleEndTimeChange}/>
                    </LocalizationProvider>
                </Grid>
            </Grid>


            <Paper variant='outlined' sx={{height: "100%"}}>
                {/*<StatTable />*/}
                <StatTable startTime={startTime?.toISOString()} endTime={endTime?.toISOString()}/>
            </Paper>
        </Box>
    );
}