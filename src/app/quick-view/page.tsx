"use client";

import {Grid, Paper, Typography} from "@mui/material";
import dynamic from "next/dynamic";
import {useMemo} from "react";
import { EventPreview } from "../_components/event-preview/EventPreview";

export default function QuickViewPage() {

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12}>
                <Typography variant="h4">Map</Typography>
            </Grid>
            <Grid item xs={12} sx={{ gap: 2, minWidth: 0 }}>
                <Paper variant='outlined' sx={{ flexGrow: 1, padding: 2, overflow: "hidden" }}>
                    <EventPreview />
                </Paper>
            </Grid>
        </Grid>
    );
}


