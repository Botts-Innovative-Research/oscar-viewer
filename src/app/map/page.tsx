"use client";

import {Box, Paper, Typography} from "@mui/material";

import MapComponent from "@/app/_components/maps/MapComponent";


export default function MapViewPage() {
    return (
        <Box>
            <Typography variant="h4" sx={{padding: 2 }}>Map</Typography>
            <br />
            <Paper variant='outlined' sx={{height: "800", width: "450"}}>
                <div style={{height: '100%', width: '100%'}}>
                    <MapComponent/>
                </div>
            </Paper>
        </Box>
    );
}


