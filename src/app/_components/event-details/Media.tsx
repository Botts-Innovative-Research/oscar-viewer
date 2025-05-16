import {Box, Grid, Paper, Typography} from "@mui/material";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import TimeController from "@/app/_components/TimeController";
import React, {useCallback, useEffect, useRef, useState} from "react";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {EventType} from "osh-js/source/core/event/EventType";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import CircularProgress from "@mui/material/CircularProgress";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";
import {isVideoDatastream} from "@/lib/data/oscar/Utilities";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import MjpegView from "osh-js/source/core/ui/view/video/MjpegView";
import FFMPEGView from "osh-js/source/core/ui/view/video/FFMPEGView";
import WebCodecView from "osh-js/source/core/ui/view/video/WebCodecView";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";


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
                replaySpeed: 0,
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
        if (chartReady) {
            console.log("Chart Ready, Starting DataSync");

            if(datasources.gamma) datasources?.gamma.connect()

            if(datasources.neutron) datasources?.neutron.connect()

            if(datasources.threshold) datasources?.threshold.connect()

            if(videoReady){
                masterTimeController.current?.connect().then(() => {
                    console.log("DataSync Should Be Connected", masterTimeController.current);

                    // setTimeout(()=>{
                    //     pause();
                    // }, 500)
                });

                if (masterTimeController.current?.isConnected()) {
                    // if is true then pause else play
                    console.log("DataSync Connected!!!");
                } else {
                    console.log("DataSync Not Connected... :(");
                }
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

                if(videoViewRef.current.videoView instanceof MjpegView){
                    var img = document.getElementsByClassName("video-mjpeg");
                    if(img.length > 0) {
                        // @ts-ignore
                        img[0].src = frameSrc;
                    }
                }else if(videoViewRef.current.videoView instanceof FFMPEGView || videoViewRef.current.videoView instanceof WebCodecView){
                    videoViewRef.current.videoView.decode(
                        savedFrame.pktSize,
                        savedFrame.pktData,
                        savedFrame.timestamp,
                        savedFrame.roll
                    )
                }
            })
        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (masterTimeController.current && await masterTimeController.current.isConnected()) {


            console.log("Playback paused.");

            await masterTimeController.current.disconnect();

            if(videoViewRef.current.videoView instanceof FFMPEGView || videoViewRef.current.videoView instanceof WebCodecView){
                await getFrameObservations(syncTime)
            }else if(videoViewRef.current.videoView instanceof MjpegView){
                var img = document.getElementsByClassName("video-mjpeg");
                // @ts-ignore
                setFrameSrc(img[0].src)

            }
        }
    };


    //when the user toggles the time controller this is the code to change the time sync
    const handleChange = useCallback( async(event: Event, newValue: number) => {

        setSyncTime(newValue);

        await masterTimeController.current.dataSynchronizerReplay.setStartTime(newValue, false).finally(() => {
            // fetchImgBlob(newValue);
            getFrameObservations(newValue);
        });


    },[masterTimeController, eventData]);

    const getFrameObservations = async(newStartTime: number)=>{

        for (const lane of laneMap.values()){

            if(lane.laneName === eventData.laneId){
                let datastreams = lane.datastreams.filter((ds: any) => isVideoDatastream(ds));

                await fetchPausedFrame(newStartTime, eventData.endTime, datastreams);
            }
        }
    }

    const videoViewRef = useRef<typeof VideoView>();

    async function fetchPausedFrame(startTime: any, endTime: string, datastreams: typeof DataStreams){

        let dsId = masterTimeController.current.dataSynchronizer.dataSources[selectedIndex.current].name.split("-")[1]
        console.log("sync ds id", dsId);


        let currentVideoDs = datastreams.filter((ds: any) => ds.properties.id === dsId);
        let obs = await currentVideoDs[0].searchObservations(new ObservationFilter({ format: 'application/swe+binary', resultTime: `${new Date(startTime).toISOString()}/${endTime}`}),1);

        const obsPage = await obs.nextPage();

        console.log("obsPage", obsPage)

        const imageData = obsPage[0].img.data

        if(videoViewRef.current.videoView instanceof FFMPEGView || videoViewRef.current.videoView instanceof WebCodecView){
            // h264 create canvas pixels
            setCanvasFrame(obsPage[0])
        }else if(videoViewRef.current.videoView instanceof MjpegView){
            // mjpeg image
            setMjpegFrame(imageData)
        }
    }

    let savedFrame: { pktSize: number, pktData: Uint8Array, timestamp: number, roll: number } | null = null;


    //function to set frame data
    function setCanvasFrame(imageData: any){
        const pktSize = imageData.img.data.length;
        const pktData = imageData.img.data;
        const timestamp = imageData.timestamp;
        const roll = imageData.roll;

        savedFrame = { pktSize, pktData, timestamp, roll };
    }

    function setMjpegFrame(imageData: any){
        let imgBlob = new Blob([imageData]);
        let url = window.URL.createObjectURL(imgBlob);

        var img = document.getElementsByClassName("video-mjpeg");

        // @ts-ignore
        img[0].src = url;
    }

    const setVideoView =(videoView: any) =>{
        videoViewRef.current = videoView
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
                        {(masterTimeController.current) ? (
                            <div>

                                <LaneVideoPlayback
                                    setVideoReady={setVideoReady}
                                    dataSynchronizer={masterTimeController.current}
                                    modeType={"detail"}
                                    onSelectedVideoIdxChange={handleUpdatingPage}
                                    setVideoView={setVideoView}
                                />

                                <TimeController handleCommitChange={handleChange} pause={pause} play={play} syncTime={syncTime} startTime={eventData?.startTime} endTime={eventData?.endTime}/>

                            </div>
                            ):
                            (
                                <div>
                                    <Typography variant="h6" align="center">No video data available.</Typography>
                                </div>
                            )}

                        </Grid>
                    </Grid>

                </Box>
            ):
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}><CircularProgress/></Box>
            }
        </Paper>
    )
}