"use client";

import {Box, Paper, Typography} from "@mui/material";
import NationalStatsTable from "../_components/national/NationalStatsTable";

import NationalDatePicker from "../_components/national/NationalDatePicker";


export default function NationalViewPage() {

    return (
        <Box>
            <Typography variant="h4">National View</Typography>
            <br/>
            <Paper variant='outlined' sx={{height: "100%"}}>
                <NationalDatePicker />
                <NationalStatsTable />
            </Paper>
        </Box>
    );
}