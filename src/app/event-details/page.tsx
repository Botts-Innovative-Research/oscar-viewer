"use client";

import {Grid, Paper, Stack, Typography} from "@mui/material";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {SelectedEvent} from "types/new-types";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";

import MiscTable from "../_components/event-details/MiscTable";
import AdjudicationDetail from "../_components/event-details/AdjudicationDetail";
import {useSelector} from "react-redux";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import ChartTimeHighlight from "../_components/event-preview/ChartTimeHighlight";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";

/**
 * Expects the following search params:
 * startTime: string;
 * endTime: string;
 *
 * Need to implement an error page to handle invalid/no search params
 */

export default function EventDetailsPage() {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector(selectEventPreview);
    const syncRef = useRef<typeof DataSynchronizer>();
    const [currentTime, setCurrentTime] = useState<string>("");
    const dsMapRef = useRef<Map<string, typeof SweApi[]>>();
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    // Video
    const [videoDatasources, setVideoDatasources] = useState<typeof SweApi[]>([]);
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);
    const [videoReady, setVideoReady] = useState<boolean>(false);

    // Chart
    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [chartReady, setChartReady] = useState<boolean>(false);


    useEffect(() => {
        setCurrentTime(eventPreview.eventData?.startTime);
    }, [eventPreview]);

    useMemo(() => {
        // create dsMapRef of eventPreview
        if (eventPreview && dsMapRef.current) {
            dsMapRef.current = laneMapRef.current.get(eventPreview.eventData?.laneId)?.getDatastreamsForEventDetail(eventPreview.eventData?.startTime, eventPreview.eventData?.endTime);
            console.log("EventPreview DS Map", dsMapRef.current);
            setLocalDSMap(dsMapRef.current);
        }
    }, [eventPreview]);

    const collectDataSources = useCallback(() => {
        let currentLane = eventPreview.eventData?.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        console.log("Collecting DataSources...", currLaneEntry, currentLane);

        let tempDSMap = new Map<string, typeof SweApi[]>();
        if (currLaneEntry) {
            let datasources = currLaneEntry?.getDatastreamsForEventDetail(eventPreview.eventData?.startTime, eventPreview.eventData?.endTime);
            console.log("DataSources", datasources);
            setLocalDSMap(datasources);
            tempDSMap = datasources;
        }
        console.log("LocalDSMap", localDSMap);

        setGammaDS(tempDSMap.get("gamma"));
        setNeutronDS(tempDSMap.get("neutron"));
        setThresholdDS(tempDSMap.get("gammaTrshld"));
        setVideoDatasources(tempDSMap.get("video"));
        setDatasourcesReady(true);

    }, [eventPreview, laneMapRef]);

    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && videoDatasources.length > 0) {
            syncRef.current = new DataSynchronizer({
                dataSources: videoDatasources,
                replaySpeed: 1.0,
                startTime: eventPreview.eventData?.startTime,
                // endTime: eventPreview.eventData.endTime,
                endTime: "now",
            });
            setDataSyncCreated(true);
        }
    }, [syncRef, dataSyncCreated, datasourcesReady, videoDatasources]);

    useEffect(() => {
        collectDataSources();
    }, [eventPreview, laneMapRef]);

    useEffect(() => {
        createDataSync();
    }, [gammaDatasources, neutronDatasources, thresholdDatasources, occDatasources, syncRef, dataSyncCreated, datasourcesReady]);

    useEffect(() => {
        if (chartReady && videoReady) {
            console.log("Chart Ready, Starting DataSync");
            gammaDatasources.forEach(ds => {
                ds.connect();
            });
            neutronDatasources.forEach(ds => {
                ds.connect();
            });
            thresholdDatasources.forEach(ds => {
                ds.connect();
            });
            occDatasources.forEach(ds => {
                ds.connect();
            });
            syncRef.current.connect().then(() => {
                console.log("DataSync Should Be Connected", syncRef.current);
            });
            if (syncRef.current.isConnected()) {
                console.log("DataSync Connected!!!");
            } else {
                console.log("DataSync Not Connected... :(");
            }
        } else {
            console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady, syncRef, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady]);


    return (
        <Stack spacing={2} direction={"column"}>
            <Grid item spacing={2}>
                <BackButton/>
            </Grid>
            <Grid item spacing={2}>
                <Typography variant="h5">Event Details</Typography>
            </Grid>
            <Grid item container spacing={2} sx={{width: "100%"}}>
                <Paper variant='outlined' sx={{width: "100%"}}>
                    <DataRow/>
                </Paper>
            </Grid>

            <Grid item container spacing={2} sx={{width: "100%"}}>
                <Paper variant='outlined' sx={{width: "100%"}}>

                    <Grid container direction="row" spacing={2}>
                        <Grid item xs>
                            {datasourcesReady && (
                                <>
                                    <ChartTimeHighlight
                                        datasources={{
                                            gamma: gammaDatasources[0] ? gammaDatasources[0] : null,
                                            neutron: neutronDatasources[0] ? neutronDatasources[0] : null,
                                            threshold: thresholdDatasources[0] ? thresholdDatasources[0] : null
                                        }}
                                        setChartReady={setChartReady}
                                        modeType="detail"
                                        currentTime={currentTime}
                                    />
                                </>
                            )}
                        </Grid>
                        <Grid item xs>
                            {datasourcesReady && (
                                <>
                                    <LaneVideoPlayback videoDatasources={videoDatasources} setVideoReady={setVideoReady}
                                                       dataSynchronizer={syncRef.current}
                                                       addDataSource={setActiveVideoIDX}/>
                                </>
                            )}
                        </Grid>
                    </Grid>
                </Paper>
            </Grid>
            <Grid item container spacing={2} sx={{width: "100%"}}>
                <Paper variant='outlined' sx={{width: "100%"}}>
                    <MiscTable currentTime={currentTime}/>
                </Paper>
            </Grid>
            <Grid item container spacing={2} sx={{width: "100%"}}>
                <Paper variant='outlined' sx={{width: "100%"}}>
                    <AdjudicationDetail event={eventPreview.eventData}/>
                </Paper>
            </Grid>
        </Stack>
    );
}
