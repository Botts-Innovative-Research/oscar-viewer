"use client";

import {Box, Grid, Paper} from "@mui/material";
import VideoGrid from "./VideoGrid";
import React, {useEffect, useState} from "react";
import ChartLane from "@/app/_components/lane-view/ChartLane";

export default function Media({datasources, currentLane}: {datasources: any, currentLane: string}) {

    const [chartReady, setChartReady] = useState<boolean>(false);


    useEffect(() => {

        async function connectDataSources(){
            if(!chartReady) return;

            datasources?.neutron?.disconnect();
            datasources?.gamma?.disconnect();
            datasources?.threshold?.disconnect();

            await datasources?.neutron?.connect();
            await datasources?.gamma?.connect();
            await datasources?.threshold?.connect();
        }


        connectDataSources();

        return () => {
            console.log("Media unmounted, cleaning up resources")

            datasources?.neutron?.disconnect();
            datasources?.gamma?.disconnect();
            datasources?.threshold?.disconnect();
        };
    }, [datasources, chartReady]);

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
                    <Grid item xs={12} md={6}>
                        <VideoGrid videoDataSources={datasources.video}/>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
  );
}
