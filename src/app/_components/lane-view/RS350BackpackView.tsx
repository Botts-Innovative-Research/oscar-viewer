"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import {Grid, Paper, Typography, Stack, Box} from "@mui/material";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import VideoMedia from "@/app/_components/lane-view/VideoMedia";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import N42Chart from "@/app/_components/n42/N42Chart";
import StatusTable from "@/app/_components/lane-view/StatusTable";
import {isBackgroundDataStream, isForegroundDataStream, isGammaDataStream, isRs350DataStream} from "@/lib/data/oscar/Utilities";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import EventTable from "@/app/_components/event-table/EventTable";
import BackButton from "@/app/_components/BackButton";
import LaneStatus from "@/app/_components/dashboard/LaneStatus";

interface RS350BackpackViewProps {
    entry: LaneMapEntry;
    currentLane: string;
    laneMap: any
}

export default function RS350BackpackView({ entry, currentLane, laneMap }: RS350BackpackViewProps) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [foregroundDatasources, setForegroundDatasources] = useState<typeof ConSysApi>();
    const [backgroundDatasources, setBackgroundDatasources] = useState<typeof ConSysApi>();
    const [alarmDatasources, setAlarmDatasources] = useState<typeof ConSysApi>();


    const collectDataSources = useCallback(async() => {

        let laneDsCollection = new LaneDSColl();

        const lane = laneMapRef.current.get(currentLane);

        if (!lane) {
            console.warn("Lane not found for currentLane:", currentLane);
            return;
        }

        for (let i = 0; i < lane.datastreams.length; i++) {
            const ds = lane.datastreams[i]

            const rtDS = lane.datasourcesRealtime[i];

            if (isForegroundDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('foregroundRT', rtDS);
                setForegroundDatasources(rtDS)
            }

            if (isBackgroundDataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('backgroundRT', rtDS);
                setBackgroundDatasources(rtDS)
            }
        }
    }, []);


    useEffect(() => {
        if (!foregroundDatasources)
            return;
        foregroundDatasources.connect();
    }, [foregroundDatasources, currentLane]);

    useEffect(() => {
        if (!backgroundDatasources)
            return;
        backgroundDatasources.connect();
    }, [backgroundDatasources, currentLane]);

    useEffect(() => {

        if(laneMapRef.current) {
            collectDataSources()
        }
    }, [laneMapRef.current]);


    return (
        <>
            <Grid container spacing={2} sx={{ width: "100%", mt: 1 }}>
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ width: "100%", p: 2, overflow: "hidden" }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <N42Chart
                                            laneName={currentLane}
                                            datasource={foregroundDatasources}
                                            title={"Foreground Linear Spectrum"}
                                            yCurve={"Counts"}
                                            yValue={"linearSpectrum"}
                                            chartId={"chart-linear-fg-ls"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <N42Chart
                                            laneName={currentLane}
                                            datasource={foregroundDatasources}
                                            title={"Foreground Compressed Spectrum"}
                                            yCurve={"Counts"}
                                            yValue={"compressedSpectrum"}
                                            chartId={"chart-linear-fg-cs"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <N42Chart
                                            laneName={currentLane}
                                            datasource={backgroundDatasources}
                                            title={"Background Linear Spectrum"}
                                            yCurve={"Counts"}
                                            yValue={"linearSpectrum"}
                                            chartId={"chart-linear-bkg-ls"}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <N42Chart
                                            laneName={currentLane}
                                            datasource={backgroundDatasources}
                                            title={"Background Compressed Spectrum"}
                                            yCurve={"Counts"}
                                            yValue={"compressedSpectrum"}
                                            chartId={"chart-linear-bkg-cs"}
                                        />
                                    </Grid>
                                </Grid>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <VideoMedia currentLane={currentLane} />
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ width: "100%", mt: 1 }}>
                <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ width: "100%", p: 2 }}>
                        <Box sx={{ width: "100%", height: { xs: 400, sm: 500, md: 600, lg: 800 } }}>
                            <EventTable
                                tableMode={"lanelog"}
                                laneMap={laneMap}
                                viewLane
                                viewAdjudicated
                                currentLane={currentLane}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </>
    );
}
