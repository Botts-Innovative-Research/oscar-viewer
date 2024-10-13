"use client";

import {Box, FormControl, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Typography} from "@mui/material";
import StatTable from "../_components/national/StatTable";
import {useState} from "react";


export default function NationalViewPage() {

    //todo: add functionality for user to select time from 1 day , 1 week,  1 month

    const defaultStartTime = 'day';
    // const defaultStartTime = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const [startTime, setStartTime] = useState(defaultStartTime);

    const handleChange = (event: SelectChangeEvent) => {
        setStartTime(event.target.value);
    };
    return (
        <Box>
            <Typography variant="h4">National View</Typography>
            <br/>
            <FormControl size="small" sx={{m:2}}>
                <InputLabel id="label">Start Time</InputLabel>
                <Select
                    label="Start Time"
                    id="label"
                    value={startTime}
                    onChange={handleChange}
                    MenuProps={{
                        MenuListProps: {
                            style: {
                                maxHeight: 300
                            }
                        }
                    }}
                    autoWidth
                    style={{ minWidth: "8em" }}>
                    <MenuItem value={'day'}>Day</MenuItem>
                    <MenuItem value={'week'}>Week</MenuItem>
                    <MenuItem value={'month'}>Month</MenuItem>
                </Select>
            </FormControl>
            <Paper variant='outlined' sx={{height: "100%"}}>
                {/*<StatTable />*/}
                <StatTable startTime={startTime}/>
            </Paper>
        </Box>
    );
}