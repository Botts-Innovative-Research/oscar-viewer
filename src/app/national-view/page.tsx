"use client";

import {Box, Paper, Typography} from "@mui/material";
import StatTable from "../_components/national/StatTable";


export default function NationalViewPage() {

    //todo: add functionality for user to select time from 1 day , 1 week,  1 month

    return (
        <Box>
            <Typography variant="h4">National View</Typography>
            <br/>
            <Paper variant='outlined' sx={{height: "100%"}}>
                <StatTable />
            </Paper>
        </Box>
    );
}