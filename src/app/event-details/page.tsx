"use client";

import {Box, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";

import MiscTable from "../_components/event-details/MiscTable";
import {useDispatch, useSelector} from "react-redux";
import {
    selectEventData,
    selectEventDatasources,
    selectEventStatus,
    setDatasources,
    setDatasourcesReady
} from '@/lib/state/EventDetailsSlice';

import ChartTimeHighlight from "../_components/event-preview/ChartTimeHighlight";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import AdjudicationDetail from "@/app/_components/adjudication/AdjudicationDetail";
import TimeController from "@/app/_components/TimeController";
import {EventType} from "osh-js/source/core/event/EventType";


/**
 * Expects the following search params:
 * startTime: string;
 * endTime: string;
 *
 * Need to implement an error page to handle invalid/no search params
 */

export default function EventDetailsPage() {

    const dispatch = useDispatch();
    const eventData = useSelector(selectEventData);
    const datasources = useSelector(selectEventDatasources);
    const datasourcesReady= useSelector(selectEventStatus);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [isLoading, setIsLoading] = useState(true);
    const syncRef = useRef<typeof DataSynchronizer>();
    const [currentTime, setCurrentTime] = useState<string>("");
    const dsMapRef = useRef<Map<string, typeof SweApi[]>>();
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);
    // const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    // Video
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);
    const [videoReady, setVideoReady] = useState<boolean>(false);

    //chart
    const [chartReady, setChartReady] = useState<boolean>(false);
    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [videoDatasources, setVideoDatasources] = useState<typeof SweApi[]>([]);

    const [syncTime, setSyncTime]= useState(0);

    useEffect(() => {
        setCurrentTime(eventData?.startTime);
    }, [eventData]);

    // useEffect(() => {
    //     // create dsMapRef of eventPreview
    //     if (dsMapRef.current) {
    //         // dsMapRef.current = laneMapRef.current.get(eventDetails.laneName)?.getDatastreamsForEventDetail(eventDetails.startTime, eventDetails.endTime);
    //         dsMapRef.current = laneMapRef.current.get(eventData?.laneId)?.getDatastreamsForEventDetail(eventData?.startTime, eventData?.endTime);
    //         console.log("EventPreview DS Map", laneMapRef.current.get(eventData?.laneId)?.getDatastreamsForEventDetail(eventData?.startTime, eventData?.endTime));
    //         setLocalDSMap(dsMapRef.current);
    //     }
    // }, [eventData]);


    const collectDataSources = useCallback(() => {
        if (!eventData?.laneId || !laneMapRef.current){
            console.log("Missing data for initialization of Event Details");
            return;
        }

        try{
            setIsLoading(true);
            let currentLane = eventData.laneId;
            const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
            if (!currLaneEntry) {
                console.error("LaneMapEntry not found for:", currentLane);
                return;
            }

            let datasources = currLaneEntry?.getDatastreamsForEventDetail(
                eventData?.startTime,
                eventData?.endTime
            );

            console.log("DataSources", datasources);

            //update local state
            setGammaDS(datasources.get("gamma") || []);
            setNeutronDS(datasources.get("neutron") || []);
            setThresholdDS(datasources.get("gammaTrshld") || []);
            setVideoDatasources(datasources.get("video") || []);
            setOccDS(datasources.get("occ") || []);

            // update redux state
            dispatch(setDatasources({
                gamma: datasources.get("gamma") || [],
                neutron: datasources.get("neutron") || [],
                threshold: datasources.get("gammaTrshld") || [],
                video: datasources.get("video") || [],
                occ: datasources.get("occ") || []
            }));
            dispatch(setDatasourcesReady(true));
        }catch(error){
            console.error("Error collecting datasources", error);

        }finally{
            setIsLoading(false);
        }

    }, [laneMapRef, eventData, dispatch]);


    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && videoDatasources.length > 0) {
            syncRef.current = new DataSynchronizer({
                dataSources: videoDatasources,
                replaySpeed: 1.0,
                startTime: eventData.startTime,
                endTime: eventData.endTime,
            });
            syncRef.current.onTime
            setDataSyncCreated(true);
        }
    }, [syncRef, dataSyncCreated, videoDatasources]);



    useEffect(() => {
        if (!eventData) {
            console.log("No eventData available. Waiting for Redux rehydration...");
            return;
        }

        if (eventData?.laneId && laneMapRef.current) {
            collectDataSources();
            console.log('Datasources collected', eventData?.laneId);
        }
    }, [eventData, laneMapRef, datasources]);

    useEffect(() => {
        createDataSync();
    }, [datasourcesReady, eventData, createDataSync, videoDatasources]);

    useEffect(() => {
        if (chartReady && videoReady && datasourcesReady) {

            console.log("Chart Ready, Starting DataSync");

            console.log('gamma dsss', gammaDatasources)
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

            syncRef.current?.connect().then(() => {
                console.log("DataSync Should Be Connected", syncRef.current);
            });

            if (syncRef.current?.isConnected()) {
                // if is true then pause else play
                console.log("DataSync Connected!!!");
            } else {
                console.log("DataSync Not Connected... :(");
            }

        } else {
            console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady, syncRef, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady, gammaDatasources, neutronDatasources, thresholdDatasources, occDatasources, datasources]);

console.log(datasourcesReady, "ready")

    useEffect(() => {
        if(syncRef.current){
            syncRef.current.subscribe((message: { type: any; timestamp: any }) => {
                    if (message.type === EventType.MASTER_TIME) {
                        setSyncTime(message.timestamp);
                    }
                }, [EventType.MASTER_TIME]
            );
        }
    }, [syncRef.current]);


    // function to start the time controller by connecting to time sync
    const start = async () => {
        if (syncRef.current) {
            await syncRef.current.connect();
            console.log("Playback started.");
        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (syncRef.current && await syncRef.current.isConnected()) {
            await syncRef.current.disconnect();
            console.log("Playback paused.");
        }
    };


    //when the user toggles the time controller this is the code to change the time sync
    const handleChange = useCallback( async(event: Event, newValue: number) => {
        // update time sync datasources start time
        for (const dataSource of syncRef.current.getDataSources()) {
            dataSource.setMinTime(newValue);
        }

        // update the time sync start time
        await syncRef.current.setTimeRange(newValue, eventData?.endTime, 1.0, false);

        setSyncTime(newValue);

    },[syncRef, eventData]);



    return (
        <Stack spacing={4} direction={"column"} sx={{width: "100%"}}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={"auto"} >
                    <BackButton/>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">Event Details</Typography>
                </Grid>
            </Grid>

            <Paper variant='outlined' sx={{ width: '100%'}}>
                <DataRow/>
            </Paper>

            <Paper variant='outlined' sx={{ width: "100%" , padding: 2}}>
                {!isLoading && datasourcesReady &&  (
                  <Box>
                      <Grid container direction="row" spacing={2} justifyContent={"center"}>
                          <Grid item xs={12} md={6}>

                              <ChartTimeHighlight
                                  datasources={{
                                      gamma: gammaDatasources?.[0] ?? null,
                                      neutron: neutronDatasources?.[0] ?? null,
                                      threshold: thresholdDatasources?.[0] ?? null,
                              }}
                                  setChartReady={setChartReady}
                                  modeType="detail"
                                  currentTime={syncTime}
                                  eventData={eventData}
                              />

                          </Grid>
                          <Grid item xs={12} md={6}>
                              <LaneVideoPlayback
                                  videoDatasources={videoDatasources}
                                  setVideoReady={setVideoReady}
                                  dataSynchronizer={syncRef.current}
                                  addDataSource={setActiveVideoIDX}
                                  modeType={"detail"}
                              />
                          </Grid>

                      </Grid>

                      <TimeController handleChange={handleChange} pause={pause} start={start} syncTime={syncTime} timeSync={syncRef.current} startTime={eventData?.startTime} endTime={eventData?.endTime}/>
                  </Box>
                )}
            </Paper>

            <Paper variant='outlined' sx={{width: "100%"}}>
                <MiscTable currentTime={eventData?.startTime}/>
            </Paper>

            <Paper variant='outlined' sx={{width: "100%"}}>
                <AdjudicationDetail event={eventData}/>
            </Paper>

        </Stack>
    );
}