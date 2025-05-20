/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

'use client'

import {
    Box,
    Button,
    IconButton,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {
    selectEventPreview,
    selectLatestGB,
    setEventPreview,
    setSelectedRowId,
    setShouldForceAlarmTableDeselect
} from "@/lib/state/EventPreviewSlice";

import {selectCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";

import AdjudicationData, {
    fetchOccupancyObservation,
    generateCommandJSON,
    IAdjudicationData,
    sendSetAdjudicatedCommand
} from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {setSelectedEvent, updateSelectedEventAdjudication} from "@/lib/state/EventDataSlice";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import {EventType} from "osh-js/source/core/event/EventType";
import TimeController, {formatTime} from "@/app/_components/TimeController";
import { setEventData } from "@/lib/state/EventDetailsSlice";
import {RootState} from "@/lib/state/Store";
import CircularProgress from "@mui/material/CircularProgress";
import {isVideoDatastream} from "@/lib/data/oscar/Utilities";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {insertObservation} from "@/lib/data/osh/Node";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import FFMPEGView from "osh-js/source/core/ui/view/video/FFMPEGView.js"
import MjpegView from "osh-js/source/core/ui/view/video/MjpegView.js"
import WebCodecView from "osh-js/source/core/ui/view/video/WebCodecView.js"

export function EventPreview() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const eventPreview = useSelector(selectEventPreview);

    const prevEventIdRef = useRef<string | null>(null);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof ConSysApi[]>>(new Map<string, typeof ConSysApi[]>());
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const syncRef = useRef<typeof DataSynchronizer>();
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);
    const currentUser = useSelector(selectCurrentUser);


    // Chart Specifics
    const [gammaDatasources, setGammaDS] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof ConSysApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof ConSysApi[]>([]);
    const [chartReady, setChartReady] = useState<boolean>(false);
    const [syncTime, setSyncTime] = useState<number>(null);
    const gammaChartRef = useRef<any>();
    const neutronChartRef = useRef<any>();

    const [frameSrc, setFrameSrc]= useState();
    const selectedIndex = useRef<number>(0)

    // Video Specifics
    const [videoReady, setVideoReady] = useState<boolean>(false);
    const [videoDatasources, setVideoDatasources] = useState<typeof ConSysApi[]>([]);
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);

    // Adjudication Specifics
    const [adjFormData, setAdjFormData] = useState<IAdjudicationData | null>();
    const [notes, setNotes] = useState<string>("");
    const [adjudicationCode, setAdjudicationCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [adjudication, setAdjudication] = useState<AdjudicationData | null>();

    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);
    const [colorStatus, setColorStatus] = useState('')

    let latestGB = useSelector((state: RootState) => selectLatestGB(state));


    const handleAdjudicationCode = (value: AdjudicationCode) => {
        console.log("Adjudication Value: ", value);
        let newAdjData: IAdjudicationData = {
            time: new Date().toISOString(),
            id: randomUUID(),
            username: currentUser,
            feedback: notes,
            adjudicationCode: value,
            isotopes: "",
            secondaryInspectionStatus: "NONE",
            filePaths: "",
            occupancyId: eventPreview.eventData.occupancyId,
            alarmingSystemUid: eventPreview.eventData.rpmSystemId
        }

        let adjudicationData = new AdjudicationData(new Date().toISOString(), currentUser, eventPreview.eventData.occupancyId, eventPreview.eventData.rpmSystemId);

        adjudicationData.setFeedback(notes);
        adjudicationData.setAdjudicationCode(value);
        console.log("[ADJ] New Adjudication Data, Ready to Send: ", newAdjData);
        setAdjudicationCode(value);
        setAdjFormData(newAdjData);
        setAdjudication(adjudicationData);
    }

    const handleNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
        let notesValues = event.target.value;
        console.log("[ADJ] Notes: ", notesValues);
        setNotes(notesValues);
    }

    const sendAdjudicationData = async () => {
        const phenomenonTime = new Date().toISOString();
        const comboData = adjudication;

        comboData.setFeedback(notes);
        comboData.setTime(phenomenonTime);

        let observation = comboData.createAdjudicationObservation();
        console.log("[ADJ] Sending Adjudication Data: ", observation);

        // send to server
        const currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        const endpoint = currLaneEntry.parentNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + adjDsID + "/observations";


        await submitAdjudication(endpoint, observation, currLaneEntry, comboData, eventPreview)
    }

    const submitAdjudication = async(endpoint: string, observation: any, currLaneEntry: LaneMapEntry, comboData: any, eventPreview: any) =>{
        try {
            const resp = await insertObservation(endpoint, observation);

            if(resp.ok){
                setAdjSnackMsg('Adjudication Submitted Successfully')
                setColorStatus('success')

            }else{
                setAdjSnackMsg('Adjudication Submission Failed. Check connection and form then try again.')
                setColorStatus('error')
            }

            // send command
            // we can use endTime as it is the same a resultTime in testing, this may not be true in practice but this is a stop-gap fix anyway
            let ds = currLaneEntry.datastreams.find((ds: any) => ds.properties.id == eventPreview.eventData.dataStreamId );
            let occupancyObservation = await fetchOccupancyObservation(ds, eventPreview.eventData.startTime, eventPreview.eventData.endTime)


            if (!occupancyObservation) {
                setAdjSnackMsg('Cannot find observation to adjudicate. Please try again.');
                setColorStatus('error')
                setOpenSnack(true);
                return;
            }

            await sendSetAdjudicatedCommand(currLaneEntry.parentNode, currLaneEntry.controlStreams[0].properties.id, generateCommandJSON(occupancyObservation[0].id, true));
            dispatch(updateSelectedEventAdjudication(comboData));

        } catch (error) {
            setAdjSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        }finally{
            setOpenSnack(true)
            resetAdjudicationData();
            handleCloseRounded();
        }
    }

    const resetAdjudicationData = () => {
        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);
        disconnectDSArray(occDatasources);
        setAdjFormData(null);
        setAdjudication(null);
        setNotes("");
        setAdjudicationCode(AdjudicationCodes.codes[0]);
    }

    const handleCloseRounded = () => {
        dispatch(setEventPreview({
            isOpen: false,
            eventData: null
        }));
        dispatch(setShouldForceAlarmTableDeselect(true))
        dispatch(setSelectedRowId(null))

    }

    const handleExpand = () => {
        console.log("opened event detail: ", eventPreview.isOpen)

        dispatch(setEventData(eventPreview.eventData));

        dispatch(setSelectedRowId(eventPreview.eventData.id))
        dispatch(setSelectedEvent(eventPreview.eventData));
        // dispatch(setShouldForceAlarmTableDeselect(false))

        router.push("/event-details");
    }

    function disconnectDSArray(dsArray: typeof ConSysApi[]) {
        dsArray.forEach(ds => {
            ds.disconnect();
        });
    }

    const cleanupResources = () => {
        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);
        disconnectDSArray(occDatasources);

        if (syncRef.current?.isConnected()) {
            syncRef.current.disconnect();
        }

        setDatasourcesReady(false);
        setDataSyncCreated(false);
        setChartReady(false);
        setVideoReady(false);
        setSyncTime(null);
        syncRef.current = null;
    };

    useEffect(() => {
        if (eventPreview.eventData?.occupancyId !== prevEventIdRef.current) {

            if (prevEventIdRef.current) {
                cleanupResources();
            }

            prevEventIdRef.current = eventPreview.eventData?.occupancyId;
            if (eventPreview.eventData?.laneId && laneMapRef.current) {
                callCollectDataSources();
                dispatch(setEventData(eventPreview.eventData));

            }
        }

    }, [eventPreview.eventData?.occupancyId]);

    const collectDataSources = useCallback(async() => {
        if (!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        console.log("Collecting DataSources...", currLaneEntry, currentLane);

        let tempDSMap = new Map<string, typeof ConSysApi[]>();

        let datasources = await currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);

        setLocalDSMap(datasources);
        tempDSMap = datasources;

        console.log("LocalDSMap", localDSMap);

        const updatedGamma = tempDSMap.get("gamma") || [];
        const updatedNeutron = tempDSMap.get("neutron") || [];
        const updatedThreshold = tempDSMap.get("gammaTrshld") || [];
        const updatedVideo = tempDSMap.get("video") || [];
        const updatedOcc = tempDSMap.get("occ") || [];

        console.log("video datasources", updatedVideo)

        setGammaDS(updatedGamma);
        setNeutronDS(updatedNeutron);
        setThresholdDS(updatedThreshold);
        setVideoDatasources(updatedVideo);
        setOccDS(updatedOcc);

        setDatasourcesReady(true);

    }, [eventPreview, laneMapRef]);


    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && videoDatasources.length > 0 && videoDatasources) {
            syncRef.current = new DataSynchronizer({
                dataSources: videoDatasources,
                replaySpeed: 1,
                startTime: eventPreview.eventData.startTime,
                endTime: eventPreview.eventData.endTime,
                intervalRate: 5
            });
            // syncRef.current.onTime
            setDataSyncCreated(true);

        }
    }, [syncRef, dataSyncCreated, datasourcesReady, videoDatasources]);

    async function callCollectDataSources(){
        await collectDataSources();
    }

    useEffect(() => {
        createDataSync();
    }, [videoDatasources, syncRef, dataSyncCreated, datasourcesReady]);



    useEffect( () => {
        if (chartReady) {
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

            if(videoReady){

                syncRef.current.connect().then(() => {
                    console.log("DataSync Should Be Connected", syncRef.current);

                    // setTimeout(()=>{
                    //     pause();
                    // }, 500)
                });


                if (syncRef.current.isConnected()) {
                    console.log("DataSync Connected!!!");
                } else {
                    console.log("DataSync Not Connected... :(");
                }

            }

        } else {
            console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady, syncRef, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady]);

    useEffect(() => {
        if(syncRef.current){
            syncRef.current.subscribe((message: { type: any; timestamp: any }) => {
                if (message.type === EventType.MASTER_TIME) {
                    setSyncTime(message.timestamp);
                }}, [EventType.MASTER_TIME]
            );
        }
    }, [syncRef.current]);


    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };


    // function to start the time controller by connecting to time sync
    const play = async () => {
        if (syncRef.current) {
            console.log("Playback started.");

            syncRef.current.connect().finally(() => {
                if(videoViewRef.current.videoView instanceof MjpegView){
                    var img = document.getElementsByClassName("video-mjpeg");
                    if(img.length > 0) {
                        // @ts-ignore
                        img[0].src = frameSrc;
                    }
                }else if(videoViewRef.current.videoView instanceof FFMPEGView || videoViewRef.current.videoView instanceof WebCodecView){
                    console.log("saved frame", savedFrame);
                    videoViewRef.current.videoView.decode(
                        savedFrame.pktSize,
                        savedFrame.pktData,
                        savedFrame.timestamp,
                        savedFrame.roll
                    )
                }

            });
        }
    };

    // function to pause the time controller by disconnecting from the time sync
    const pause = async () => {
        if (syncRef.current) {

            console.log("Playback paused.");

            await syncRef.current.disconnect();

            if(videoViewRef.current.videoView instanceof FFMPEGView || videoViewRef.current.videoView instanceof WebCodecView){
                await getFrameObservations(syncTime)
            }else if(videoViewRef.current.videoView instanceof MjpegView){
                var img = document.getElementsByClassName("video-mjpeg");
                // @ts-ignore
                setFrameSrc(img[0].src)

            }

        }
    };


    // when the user toggles the time controller this is the code to change the time sync
    const handleCommitChange = useCallback( async(event: Event, newValue: number) => {

        setSyncTime(newValue);

        await syncRef.current.dataSynchronizerReplay.setStartTime(newValue, false).finally(() => {
            getFrameObservations(newValue);
        });

    },[syncRef, eventPreview.eventData.endTime]);



    const getFrameObservations = async(newStartTime: number)=>{

        for (const lane of laneMapRef.current.values()){

            if(lane.laneName === eventPreview.eventData.laneId){
                let datastreams = lane.datastreams.filter((ds: any) => isVideoDatastream(ds));

                await fetchPausedFrame(newStartTime, eventPreview.eventData.endTime, datastreams);
            }
        }
    }


    const videoViewRef = useRef<typeof VideoView>();

    async function fetchPausedFrame(startTime: any, endTime: string, datastreams: typeof DataStreams){

        let dsId = syncRef.current.dataSynchronizer.dataSources[selectedIndex.current].name.split("-")[1]

        let currentVideoDs = datastreams.filter((ds: any) => ds.properties.id === dsId);
        let obs = await currentVideoDs[0].searchObservations(new ObservationFilter({ format: 'application/swe+binary', resultTime: `${new Date(startTime).toISOString()}/${endTime}`}),1);

        const obsPage = await obs.nextPage();

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
        const roll = imageData.roll | 0;

        console.log("image data", imageData)
        savedFrame = { pktSize, pktData, timestamp, roll };
        console.log("image data saved to frame: ", savedFrame)
    }

    function setMjpegFrame(imageData: any){
        let imgBlob = new Blob([imageData]);
        let url = window.URL.createObjectURL(imgBlob);

        var img = document.getElementsByClassName("video-mjpeg");

        // @ts-ignore
        img[0].src = url;
    }

    const handleUpdatingPage = (page: number)=>{
        selectedIndex.current = page;

        // syncRef.current.connect().then(()=>{
        //     getFrameObservations(syncTime);
        //
        //     setTimeout(()=>{
        //         pause();
        //     }, 500)
        // })


    }

    const setVideoView =(videoView: any) =>{
        videoViewRef.current = videoView
    }

    return (
        <Stack p={1} display={"flex"} spacing={1}>
            <Stack direction={"row"} justifyContent={"space-between"} spacing={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Typography variant="h6">Occupancy ID: {eventPreview.eventData.occupancyId}</Typography>
                    <IconButton onClick={handleExpand} aria-label="expand">
                        <OpenInFullRoundedIcon fontSize="small"/>
                    </IconButton>
                </Stack>
                <IconButton onClick={handleCloseRounded} aria-label="close">
                    <CloseRoundedIcon fontSize="small"/>
                </IconButton>
            </Stack>

            {(datasourcesReady && latestGB) ? (
                    <Box>
                        <ChartTimeHighlight
                            datasources={{
                                gamma: gammaDatasources[0],
                                neutron: neutronDatasources[0],
                                threshold: thresholdDatasources[0]
                            }}
                            setChartReady={setChartReady}
                            modeType="preview"
                            currentTime={syncTime}
                            eventData={eventPreview.eventData}
                            latestGB={latestGB}
                        />

                        {(syncRef.current) ?
                            (
                                <div>
                                    <LaneVideoPlayback
                                        setVideoReady={setVideoReady}
                                        dataSynchronizer={syncRef.current}
                                        modeType={"preview"}
                                        onSelectedVideoIdxChange={handleUpdatingPage}
                                        setVideoView={setVideoView}
                                    />
                                    <TimeController handleCommitChange={handleCommitChange} pause={pause} play={play} syncTime={syncTime}  startTime={eventPreview.eventData.startTime} endTime={eventPreview.eventData.endTime}/>

                                </div>
                            )
                            :
                           (
                               <div>
                                   <Typography variant="h6" align="center">No video data available.</Typography>
                               </div>
                           )}
                        </Box>
                ) :

                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}><CircularProgress/></Box>
            }

            <Stack spacing={2}>
                <AdjudicationSelect adjCode={adjudicationCode} onSelect={handleAdjudicationCode}/>
                <TextField
                    onChange={handleNotes}
                    id="outlined-multiline-static"
                    label="Notes"
                    multiline
                    rows={4}
                />
                <Stack direction={"row"} spacing={10} sx={{width: "100%"}} justifyContent={"center"}>
                    <Button onClick={sendAdjudicationData} variant={"contained"} size={"small"} fullWidth={false} color={"success"} disabled={adjFormData === null} sx={{width: "25%"}}>Submit</Button>
                    <Snackbar
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        open={openSnack}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={adjSnackMsg}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: colorStatus === 'success' ? 'green' : 'red',
                            },
                        }}
                    />

                    <Button onClick={resetAdjudicationData} variant={"contained"} size={"small"} fullWidth={false} color={"secondary"} sx={{width: "25%"}}>Reset</Button>
                </Stack>
            </Stack>
        </Stack>
    )
}