"use client";

import {Box, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";

import MiscTable from "../_components/event-details/MiscTable";
import {useDispatch, useSelector} from "react-redux";
import {
    selectEventData,
    selectEventDatasources, setDatasources, setEventData,
} from '@/lib/state/EventDetailsSlice';

import ChartTimeHighlight from "../_components/event-preview/ChartTimeHighlight";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import AdjudicationDetail from "@/app/_components/adjudication/AdjudicationDetail";
import TimeController from "@/app/_components/TimeController";
import {EventType} from "osh-js/source/core/event/EventType";

import {store} from "@/lib/state/Store";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useSearchParams} from "next/navigation";




/**
 * Expects the following search params:
 * startTime: string;
 * endTime: string;
 *
 * Need to implement an error page to handle invalid/no search params
 */

export default function EventDetailsPage() {
    const dispatch = useAppDispatch();

    const eventData = useSelector(selectEventData);
    const datasources = useSelector(selectEventDatasources);

    //possible use search params as a backup
    const searchParams = useSearchParams();


    const syncRef = useRef<typeof DataSynchronizer>();
    const [currentTime, setCurrentTime] = useState<string>("");
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);

    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    // Video
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);
    const [videoReady, setVideoReady] = useState<boolean>(false);

    //chart
    const [chartReady, setChartReady] = useState<boolean>(false);

    const [syncTime, setSyncTime]= useState(0);

    useEffect(() => {
        console.log(store.getState());

        if(eventData && datasources) {
            console.log('event data', eventData)
            console.log('datasources', datasources)
            setCurrentTime(eventData?.startTime);
            setDatasourcesReady(true);
        }
    }, [eventData, datasources]);


    useEffect(() => {
        if (datasources && datasources.video.length > 0 && !(datasources.video[0] instanceof SweApi)) {
            const newDatasources = {
                video: datasources.video.map(ds => new SweApi(ds)),
                gamma: datasources.gamma.map(ds => new SweApi(ds)),
                neutron: datasources.neutron.map(ds => new SweApi(ds)),
                threshold: datasources.threshold.map(ds => new SweApi(ds)),
                occ: datasources.occ.map(ds => new SweApi(ds)),
            };

            dispatch(setDatasources(newDatasources));
        }
    }, [datasources, dispatch]);

    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && datasources?.video.length > 0) {

            console.log("VIDEO DS: ", datasources.video)

            const videoDS = datasources.video;
            const isSweApiInstance = videoDS[0] instanceof SweApi;

            syncRef.current = new DataSynchronizer({
                dataSources: isSweApiInstance ? videoDS : videoDS.map(ds => new SweApi(ds)),
                replaySpeed: 1.0,
                startTime: eventData?.startTime,
                endTime: eventData?.endTime,
            });

            syncRef.current.onTime
            setDataSyncCreated(true);
            // dispatch(setEventData(eventData));
        }
    }, [syncRef, dataSyncCreated, datasources, datasourcesReady, eventData]);


    useEffect(() => {
        if(eventData && datasources)
            createDataSync();
    }, [datasourcesReady, syncRef, dataSyncCreated, datasources, eventData]);

    useEffect(() => {

        if (chartReady && videoReady && datasources) {
            console.log("Chart Ready, Starting DataSync");

            datasources?.gamma.map(ds => {
                console.log("GAMMA", ds)
                const myDs = ds instanceof SweApi ? ds : new SweApi(ds);
                console.log("NEW GAMMA", ds)
                myDs.connect();
            });
            datasources?.neutron.map(ds => {
                const myDs = ds instanceof SweApi ? ds : new SweApi(ds);
                myDs.connect();
            });
            datasources?.threshold.map(ds => {
                const myDs = ds instanceof SweApi ? ds : new SweApi(ds);
                myDs.connect();
            });
            datasources?.occ.map(ds => {
                const myDs = ds instanceof SweApi ? ds : new SweApi(ds);
                myDs.connect();
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
    }, [chartReady, syncRef, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady, datasources]);


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
        if (syncRef.current && !await syncRef.current.isConnected()) {

            await syncRef.current.setReplaySpeed(1.0);

            // await syncRef.current.connect();

            console.log("Playback started.");
        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (syncRef.current && await syncRef.current.isConnected()) {
            await syncRef.current.setReplaySpeed(0.0);

            // await syncRef.current.disconnect();

            console.log("Playback paused.");
        }
    };


    //when the user toggles the time controller this is the code to change the time sync
    const handleChange = useCallback( async(event: Event, newValue: number, isPlaying: boolean) => {
        // update time sync datasources start time
        for (const dataSource of syncRef.current.getDataSources()) {
            dataSource.setMinTime(newValue);
        }

        // update the time sync start time
        await syncRef.current.setTimeRange(newValue, eventData?.endTime, (isPlaying ? 1.0 : 0.0), false);

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
                {datasourcesReady && (
                  <Box>
                      <Grid container direction="row" spacing={2} justifyContent={"center"}>
                          <Grid item xs={12} md={6}>
                              <ChartTimeHighlight
                                  datasources={{
                                      gamma:  datasources.gamma?.[0] ?? null,
                                      neutron:  datasources.neutron?.[0] ?? null,
                                      threshold: datasources.threshold?.[0] ?? null,
                              }}
                                  setChartReady={setChartReady}
                                  modeType="detail"
                                  currentTime={syncTime}
                                  eventData={eventData}
                              />

                          </Grid>
                          <Grid item xs={12} md={6}>
                              <LaneVideoPlayback
                                  videoDatasources={datasources.video}
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