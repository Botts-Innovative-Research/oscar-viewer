import {Box, Grid, Paper} from "@mui/material";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import TimeController from "@/app/_components/TimeController";
import React, {useCallback, useEffect, useRef, useState} from "react";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {EventType} from "osh-js/source/core/event/EventType";
import {event} from "next/dist/build/output/log";
import DataStreams from "osh-js/source/core/sweapi/datastream/DataStreams";
import {getObservations} from "@/app/utils/ChartUtils";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import CircularProgress from "@mui/material/CircularProgress";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";


export default function Media({eventData, datasources}: {eventData: any, datasources: any}){

    const syncRef = useRef<typeof DataSynchronizer>();
    const [currentTime, setCurrentTime] = useState<string>("");
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);

    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    // Video
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);
    const [videoReady, setVideoReady] = useState<boolean>(false);

    //chart
    const [chartReady, setChartReady] = useState<boolean>(false);

    const [syncTime, setSyncTime]= useState(0);

    let latestGB = useSelector((state: RootState) => selectLatestGB(state));
    console.log("chart latestGB", latestGB);

    // const nodes =  useSelector((state: RootState) => selectNodes(state));
    // const [latestGB, setLatestGB] = useState<number>();



    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && datasources?.video.length > 0) {

            console.log("VIDEO DS: ", datasources.video)

            const videoDS = datasources.video;
            // const isSweApiInstance = videoDS[0] instanceof SweApi;

            syncRef.current = new DataSynchronizer({
                dataSources: videoDS,
                replaySpeed: 1.0,
                startTime: eventData?.startTime,
                endTime: eventData?.endTime,
            });

            syncRef.current.onTime
            setDataSyncCreated(true);
            setDataSyncReady(true);
        }
    }, [chartReady, syncRef, dataSyncCreated, datasources, datasourcesReady, eventData]);


    useEffect(() => {
        if(eventData && datasources){
            console.log("EVENT DATA", eventData, "datasources", datasources)
            createDataSync();
            setCurrentTime(eventData?.startTime);

            setDatasourcesReady(true);
        }

    }, [datasources, eventData]);

    useEffect(() => {
        console.log('dssss', datasources)
        if (chartReady && videoReady) {
            console.log("Chart Ready, Starting DataSync");

            if(datasources.gamma) datasources?.gamma.connect()

            if(datasources.neutron) datasources?.neutron.connect()

            if(datasources.threshold) datasources?.threshold.connect()


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
    const play = async () => {
        if (syncRef.current ) { //&& !await syncRef.current.isConnected()

            await syncRef.current.setReplaySpeed(1.0);


            console.log("Playback started.");
            await syncRef.current.connect();

        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (syncRef.current && await syncRef.current.isConnected()) {
            await syncRef.current.setReplaySpeed(0.0);

            // syncRef.current.disconnect();

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
        <Paper variant='outlined' sx={{ width: "100%" , padding: 2}}>
            {datasourcesReady && latestGB ? (
                <Box>
                    <Grid container direction="row" spacing={2} justifyContent={"center"}>
                        <Grid item xs={12} md={6}>
                            <ChartTimeHighlight
                                // key={eventData.id + "-detail"}
                                datasources={{
                                    gamma:  datasources.gamma,
                                    neutron:  datasources.neutron,
                                    threshold: datasources.threshold,
                                }}
                                setChartReady={setChartReady}
                                modeType="detail"
                                currentTime={syncTime}
                                eventData={eventData}
                                latestGB={latestGB}
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

                    <TimeController handleChange={handleChange} pause={pause} play={play} syncTime={syncTime} timeSync={syncRef.current} startTime={eventData?.startTime} endTime={eventData?.endTime}/>
                </Box>
            ):
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}><CircularProgress/></Box>
            }
        </Paper>
    )
}