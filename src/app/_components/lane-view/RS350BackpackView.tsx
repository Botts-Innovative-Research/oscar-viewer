"use client";

import React, {useCallback, useContext, useEffect, useState} from "react";
import {Grid, Paper, Typography, Stack, Box} from "@mui/material";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import VideoMedia from "@/app/_components/lane-view/VideoMedia";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import N42Chart from "@/app/_components/n42/N42Chart";
import StatusTable from "@/app/_components/lane-view/StatusTable";
import {isForegroundDataStream, isGammaDataStream, isRs350DataStream} from "@/lib/data/oscar/Utilities";
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


    // const collectDataSources = useCallback(async() => {
    //     const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
    //     if (!currLaneEntry) {
    //         console.error("LaneMapEntry not found for:", currentLane);
    //         return;
    //     }
    //
    //     let tempDSMap: Map<string, typeof ConSysApi[]>;
    //
    //     let datasources = await currLaneEntry.getDatastreamsForN42EventDetail('2020-01-01T08:13:25.845Z', 'now');
    //
    //     console.log('datasources', datasources)
    //     setForgroundDatasources(datasources.get('n42') || []);
    //
    //
    // },[laneMapRef, currentLane]);

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

            if (isRs350DataStream(ds)) {
                rtDS.properties.mqttOpts.shared = true
                laneDsCollection.addDS('n42RT', rtDS);
                setForegroundDatasources(rtDS)
            }
        }
    }, []);


    useEffect(() => {
        if (!foregroundDatasources)
            return;
        foregroundDatasources.connect();
    }, [foregroundDatasources, currentLane]);

    useEffect(() => {

        if(laneMapRef.current) {
            collectDataSources()
        }
    }, [laneMapRef.current]);

    // // get datastreams status, alarm, foreground, background
    // const checkForDataSource = useCallback(async () => {
    //     let datastream = entry.datastreams.find(ds => isForegroundDataStream(ds));
    //     let intitialRes = await datastream.searchObservations(new ObservationFilter({ resultTime: 'latest'}),1);
    //     let res = await intitialRes.nextPage();
    //
    //     console.log('res', res[0])
    //
    // },[]);

    // useEffect(() => {
    //     if (entry)
    //         checkForDataSource();
    // }, [entry]);

    return (
     <>
         <Grid item container spacing={2} sx={{ width: "100%" }}>
             <Paper variant='outlined' sx={{ width: "100%"}}>
                 {/*TODO:  Lane status*/}
             </Paper>
         </Grid>

         <Grid item container spacing={2} sx={{ width: "100%" }}>
             <Paper variant='outlined' sx={{ width: "100%" }}>
                 <Box sx={{flexGrow: 1, overflowX: "auto"}}>
                     <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                         <Grid item xs={12} md={6}>
                             <Box display='flex' alignItems="center">
                                 <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                                     <Grid item xs>
                                         <N42Chart
                                             laneName={currentLane}
                                             datasource={foregroundDatasources}
                                             title={"Foreground Linear Spectrum"}
                                             yCurve={"Counts"}
                                             yValue={"linearSpectrum"}
                                             chartId={"chart-linear-fg"}
                                         />
                                     </Grid>
                                     <Grid item xs>
                                         {/*TODO: Change to Background Linear Spectrum*/}
                                         <N42Chart
                                             laneName={currentLane}
                                             datasource={foregroundDatasources}
                                             title={"Background Linear Spectrum"}
                                             yCurve={"Counts"}
                                             yValue={"linearSpectrum"}
                                             chartId={"chart-linear-bkg"}
                                         />
                                     </Grid>
                                 </Grid>
                             </Box>
                         </Grid>
                         <VideoMedia currentLane={currentLane} />
                     </Grid>
                 </Box>
             </Paper>
         </Grid>

         <Grid item container spacing={2} sx={{ width: "100%" }}>
             <Paper variant='outlined' sx={{ width: "100%", height: "100%", padding: 2}}>
                 <Grid container direction="column" sx={{ width: "100%"}}>
                     <Grid item sx={{ width: "100%", height: 800 }}>
                         <EventTable
                             tableMode={'lanelog'}
                             laneMap={laneMap}
                             viewLane
                             viewAdjudicated
                             currentLane={currentLane}
                         />
                     </Grid>
                 </Grid>
             </Paper>
         </Grid>
     </>
    );
}
