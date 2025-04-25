import {Box, Grid, Paper} from "@mui/material";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import TimeController from "@/app/_components/TimeController";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {EventType} from "osh-js/source/core/event/EventType";
import {event} from "next/dist/build/output/log";
import DataStreams from "osh-js/source/core/ConSysApi/datastream/DataStreams";
import {getObservations} from "@/app/utils/ChartUtils";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import CircularProgress from "@mui/material/CircularProgress";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";
import {isVideoDatastream} from "@/lib/data/oscar/Utilities";
import ObservationFilter from "osh-js/source/core/ConSysApi/observation/ObservationFilter";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";


export default function Media({eventData, datasources, laneMap}: {eventData: any, datasources: any, laneMap: any}){

    const masterTimeController = useRef<typeof DataSynchronizer>();
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

    const [frameSrc, setFrameSrc]= useState();

    const selectedIndex = useRef<number>(0)


    const createDataSync = useCallback(() => {
        if (!masterTimeController.current && !dataSyncCreated && datasources?.video.length > 0) {

            const videoDS = datasources.video;

            masterTimeController.current = new DataSynchronizer({
                dataSources: videoDS,
                replaySpeed: 1.0,
                startTime: eventData?.startTime,
                endTime: eventData?.endTime,
            });

            masterTimeController.current.onTime
            setDataSyncCreated(true);
            setDataSyncReady(true);
        }
    }, [chartReady, masterTimeController, dataSyncCreated, datasources, datasourcesReady, eventData]);


    useEffect(() => {
        if(eventData && datasources){
            createDataSync();
            setCurrentTime(eventData?.startTime);

            setDatasourcesReady(true);
        }

    }, [datasources, eventData]);

    useEffect(() => {
        if (chartReady && videoReady) {
            console.log("Chart Ready, Starting DataSync");

            if(datasources.gamma) datasources?.gamma.connect()

            if(datasources.neutron) datasources?.neutron.connect()

            if(datasources.threshold) datasources?.threshold.connect()


            masterTimeController.current?.connect().then(() => {
                console.log("DataSync Should Be Connected", masterTimeController.current);
            });

            if (masterTimeController.current?.isConnected()) {
                // if is true then pause else play
                console.log("DataSync Connected!!!");
            } else {
                console.log("DataSync Not Connected... :(");
            }

        } else {
            console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady, masterTimeController, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady, datasources]);


    useEffect(() => {
        if(masterTimeController.current){
            masterTimeController.current.subscribe((message: { type: any; timestamp: any }) => {
                    if (message.type === EventType.MASTER_TIME) {
                        setSyncTime(message.timestamp);
                    }
                }, [EventType.MASTER_TIME]
            );
        }
    }, [masterTimeController.current]);


    // function to start the time controller by connecting to time sync
    const play = async () => {
        if (masterTimeController.current ) {

            var img = document.getElementsByClassName("video-mjpeg");

            masterTimeController.current.connect().finally(()=>{
                if(img.length > 0) {
                    img[0].src = frameSrc;
                }
            })
        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (masterTimeController.current && await masterTimeController.current.isConnected()) {


            console.log("Playback paused.");

            await masterTimeController.current.disconnect();

            var img = document.getElementsByClassName("video-mjpeg");

            setFrameSrc(img[0].src)
        }
    };


    //when the user toggles the time controller this is the code to change the time sync
    const handleChange = useCallback( async(event: Event, newValue: number) => {

        setSyncTime(newValue);

        await masterTimeController.current.dataSynchronizerReplay.setStartTime(newValue, false).finally(() => {
            fetchImgBlob(newValue);
        });


    },[masterTimeController, eventData]);


    const fetchImgBlob = async(newVal: any)=>{

        console.log(laneMap)
        for (const lane of laneMap.values()){

            if(lane.laneName === eventData.laneId){
                let datastreams = lane.datastreams.filter((ds: any) => isVideoDatastream(ds));

                await fetchFrameCreateBlob(newVal, eventData.endTime, datastreams);
            }
        }
    }


    async function fetchFrameCreateBlob(startTime: any, endTime: any, datastreams: any){

        let dsId = masterTimeController.current.dataSynchronizer.dataSources[selectedIndex.current].name.split("-")[1]


        let currentVideoDs = datastreams.filter((ds: any) => ds.properties.id === dsId);
        let obs = await currentVideoDs[0].searchObservations(new ObservationFilter({ format: 'application/swe+binary', resultTime: `${new Date(startTime).toISOString()}/${endTime}`}),1);

        const obsPage = await obs.nextPage();

        let imgBlob = new Blob([obsPage[0].img.data]);
        let url = window.URL.createObjectURL(imgBlob);

        var img = document.getElementsByClassName("video-mjpeg");

        img[0].src = url;

    }

    const handleUpdatingPage = (page: number)=>{
        selectedIndex.current = page;
    }

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
                                setVideoReady={setVideoReady}
                                dataSynchronizer={masterTimeController.current}
                                modeType={"detail"}
                                onSelectedVideoIdxChange={handleUpdatingPage}
                            />
                        </Grid>

                    </Grid>

                    <TimeController handleCommitChange={handleChange} pause={pause} play={play} syncTime={syncTime} startTime={eventData?.startTime} endTime={eventData?.endTime}/>
                </Box>
            ):
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}><CircularProgress/></Box>
            }
        </Paper>
    )
}