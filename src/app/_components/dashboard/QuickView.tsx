"use client";

import { Box, Grid, Paper } from '@mui/material';
import { useSelector } from "react-redux";
import {selectEventPreview} from "@/lib/state/EventPreviewSlice";
import { EventPreview } from "@/app/_components/event-preview/EventPreview";
import MapComponent from '../maps/MapComponent';
import React, { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";

export default function QuickView() {
    const eventPreview = useSelector(selectEventPreview);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <Grid item xs={4}>
                <Paper variant='outlined' sx={{height: "100%"}}>
                    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                        <CircularProgress/>
                    </Box>
                </Paper>
            </Grid>
        )
    }

    return (
        <Box style={{width: '100%', height: '300', padding: 10, overflow: 'hidden'}}>
            {eventPreview.isOpen && eventPreview.eventData ? <EventPreview /> : <MapComponent/>}
        </Box>
    );
}