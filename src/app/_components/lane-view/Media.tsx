"use client";

import {Box, Grid, Paper} from "@mui/material";
import React, {useEffect, useState} from "react";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import VideoMedia from "./VideoMedia";
import {acquireSharedConnection} from "@/lib/data/oscar/LaneCollection";


export default function Media({datasources, currentLane}: {datasources: any, currentLane: string}) {
    const [chartReady, setChartReady] = useState<boolean>(false);
    const neutronDataSource = datasources?.neutron;
    const gammaDataSource = datasources?.gamma;
    const thresholdDataSource = datasources?.threshold;

    useEffect(() => {
        const sources = [neutronDataSource, gammaDataSource, thresholdDataSource]
            .filter(Boolean);
        if (sources.length === 0)
            return;

        let active = true;

        // Each feed is independent. Start them together so a slow or failed
        // RPM cannot delay the other live charts.
        const leases = sources.map((source) => {
            const lease = acquireSharedConnection(source);
            void lease.ready.catch((error) => {
                if (active)
                    console.warn("Unable to connect lane chart stream", error);
            });
            return lease;
        });

        return () => {
            active = false;
            leases.forEach((lease) => {
                void lease.release().catch((error) => {
                    console.warn("Unable to disconnect lane chart stream", error);
                });
            });
        };
    }, [currentLane, gammaDataSource, neutronDataSource, thresholdDataSource]);

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
                        <VideoMedia currentLane={currentLane} />
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}
