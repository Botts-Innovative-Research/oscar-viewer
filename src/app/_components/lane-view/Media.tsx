"use client";

import {Box, Grid, Paper} from "@mui/material";
import React, {useEffect, useState} from "react";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import VideoMedia from "./VideoMedia";


export default function Media({datasources, currentLane}: {datasources: any, currentLane: string}) {
    const [chartReady, setChartReady] = useState<boolean>(false);

    useEffect(() => {
        if (!datasources)
            return;

        async function connectDataSources(){
            await datasources?.neutron?.connect();
            await datasources?.gamma?.connect();
            await datasources?.threshold?.connect();
        }
        connectDataSources();
    }, [datasources, currentLane]);

    return (
        <Paper variant='outlined' sx={{ width: "100%" }}>
            <Box sx={{flexGrow: 1, overflowX: "auto"}}>
                <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                    <Grid item xs={12} md={6}>
                        <ChartLane
                            laneName={currentLane}
                            setChartReady={setChartReady}
                            datasources={{
                                gamma: datasources.gamma,
                                neutron: datasources.neutron,
                                threshold: datasources.threshold,
                            }}
                        />
                    </Grid>
                    <VideoMedia currentLane={currentLane} />
                </Grid>
            </Box>
        </Paper>
    );
}
