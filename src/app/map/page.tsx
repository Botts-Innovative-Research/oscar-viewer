"use client";

import {Grid, Paper, Typography} from "@mui/material";
import dynamic from "next/dynamic";
import {useMemo} from "react";

export default function MapViewPage() {

    const Map = useMemo(() => dynamic(
        () => import('@/app/_components/maps/MapComponent'),
        {
            loading: () => <p> loading </p>,
            ssr: false
        }
    ),[])

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12}>
                <Typography variant="h4">Map</Typography>
            </Grid>
            <Grid item xs={12} sx={{ gap: 2, minWidth: 0 }}>
                <Paper variant='outlined'>
                    <Map/>
                </Paper>
            </Grid>
        </Grid>
    );
}


