"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import {Grid, Paper, Typography, Stack, Box} from "@mui/material";
import { LaneMapEntry } from "@/lib/data/oscar/LaneCollection";
import {isForegroundDataStream} from "@/lib/data/oscar/Utilities";
import VideoMedia from "@/app/_components/lane-view/VideoMedia";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

interface RS350BackpackViewProps {
    entry: LaneMapEntry;
    currentLane: string;
}

export default function RS350BackpackView({ entry, currentLane }: RS350BackpackViewProps) {

    // get datastreams status, alarm, foreground, background
    const checkForForeground = useCallback(async () => {

        let foregroundDs = entry.datastreams.find(ds => isForegroundDataStream(ds));

        let intitialRes = await foregroundDs.searchObservations(new ObservationFilter({ resultTime: 'latest'}),1);

        let foregroundArr = await intitialRes.nextPage();

        console.log("foreground Arr", foregroundArr[0].result)

    },[]);

    useEffect(() => {
        if (entry) {
            checkForForeground();
        }
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
                            {/* TODO: Add RS350 status data display */}
                            <Typography variant="body2" color="text.secondary">
                                Status data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                Foreground Report
                            </Typography>
                            {/* TODO: Add RS350 foreground data display */}
                            <Typography variant="body2" color="text.secondary">
                                Foreground report data will be displayed here
                            </Typography>
                        </Paper>
                    </Grid>
                    {/*<Grid item xs={12} md={6}>*/}
                    {/*    <Paper variant="outlined" sx={{ padding: 2, height: "100%" }}>*/}
                    {/*        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>*/}
                    {/*            Background Report*/}
                    {/*        </Typography>*/}
                    {/*        /!* TODO: Add RS350 background data display *!/*/}
                    {/*        <Typography variant="body2" color="text.secondary">*/}
                    {/*            Background report data will be displayed here*/}
                    {/*        </Typography>*/}
                    {/*    </Paper>*/}
                    {/*</Grid>*/}
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
