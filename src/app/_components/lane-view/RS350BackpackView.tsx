"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import {Grid, Paper, Typography, Stack, Box} from "@mui/material";
import { LaneMapEntry } from "@/lib/data/oscar/LaneCollection";
import VideoMedia from "@/app/_components/lane-view/VideoMedia";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import N42Chart from "@/app/_components/n42/N42Chart";
import StatusTable from "@/app/_components/lane-view/StatusTable";
import { isRs350DataStream } from "@/lib/data/oscar/Utilities";

interface RS350BackpackViewProps {
    entry: LaneMapEntry;
    currentLane: string;
}

export default function RS350BackpackView({ entry, currentLane }: RS350BackpackViewProps) {

    // get datastreams status, alarm, foreground, background
    const checkForDataSource = useCallback(async () => {
        let datastream = entry.datastreams.find(ds => isRs350DataStream(ds));
        let intitialRes = await datastream.searchObservations(new ObservationFilter({ resultTime: 'latest'}),1);
        let res = await intitialRes.nextPage();


    },[]);

    useEffect(() => {
        if (entry)
            checkForDataSource();
    }, [entry]);

    return (
        <Stack spacing={2} direction="column" sx={{ width: "100%" }}>
            <Paper variant="outlined" sx={{ width: "100%", padding: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Status
                            </Typography>
                           <StatusTable currentLane={currentLane} entry={}/>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Foreground Report
                            </Typography>
                            {/* TODO: Add RS350 foreground data display */}
                            <N42Chart laneName={currentLane} datasource={} setChartReady={} title={"Foreground Report"} yCurve={} yValue={}/>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Background Report
                            </Typography>
                            {/* TODO: Add RS350 background data display */}
                            <N42Chart laneName={currentLane} datasource={} setChartReady={} title={"Background Report"} yCurve={} yValue={}/>

                        </Paper>
                    </Grid>
                    {/*<Grid item xs={12} md={6}>*/}
                    {/*    <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>*/}
                    {/*        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>*/}
                    {/*            Alarms*/}
                    {/*        </Typography>*/}
                    {/*        /!* TODO: Add RS350 alarm data display *!/*/}
                    {/*        <Typography variant="body2" color="text.secondary">*/}
                    {/*            Alarm data will be displayed here*/}
                    {/*        </Typography>*/}
                    {/*    </Paper>*/}
                    {/*</Grid>*/}
                    <VideoMedia currentLane={currentLane} />
                </Grid>
            </Paper>
        </Stack>
    );
}
