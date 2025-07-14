"use client";

import {Box, Paper, Typography} from "@mui/material";
import dynamic from "next/dynamic";
import React, {useMemo} from "react";
import CircularProgress from "@mui/material/CircularProgress";

export default function MapViewPage() {

    const Map = useMemo(() => dynamic(
        () => import('@/app/_components/maps/MapComponent'),
        {
            loading: () =>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center'
                }}
                >
                    <CircularProgress />
                </Box>,
            ssr: false
        }
    ),[])

    return (
        <Box>
            <Typography
                variant="h4"
                sx={{padding: 2}}
            >
                Map
            </Typography>
            <br />
            <Paper
                variant='outlined'
                sx={{
                    height: "900",
                    width: "600"
            }}
            >
                <div
                    style={{
                        height: '100%',
                        width: '100%'
                }}
                >
                    <Map />
                </div>
            </Paper>
        </Box>
    );
}


