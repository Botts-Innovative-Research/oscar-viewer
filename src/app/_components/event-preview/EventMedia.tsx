import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import TimeController from "@/app/_components/TimeController";
import React, {useRef, useState} from "react";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLatestGB} from "@/lib/state/EventPreviewSlice";
import Box from "@mui/material/Box";
import {Grid, Paper} from "@mui/material";


export default function EventMedia({datasources, eventData, mode}: {datasources: typeof ConSysApi, eventData: EventTableData, mode: string},) {
    let latestGB = useSelector((state: RootState) => selectLatestGB(state));

    const [videoCurrentTime, setVideoCurrentTime] = useState<number | null>(null);
    const [videoIsPlaying, setVideoIsPlaying] = useState(true);
    const [syncTime, setSyncTime] = useState<number | null>(null);
    const selectedIndex = useRef<number>(0)

    // const handlePlay = () => {
    //     setVideoIsPlaying(true);
    // };
    //
    // const handlePause = () => {
    //     setVideoIsPlaying(false);
    // };
    //
    // const handleCommitChange = (event: Event, newValue: number | number[]) => {
    //     const timeValue = Array.isArray(newValue) ? newValue[0] : newValue;
    //     setSyncTime(timeValue);
    //     setVideoCurrentTime(timeValue);
    // };


    const handleVideoTimeUpdate = (timeMs: number) => {
        if (!videoIsPlaying) return;
        setSyncTime(timeMs);
        setVideoCurrentTime(timeMs);
    };

    // const handleTimeControllerUpdate = (timeMs: number) => {
    //     setVideoCurrentTime(timeMs);
    // };
    //
    // const handlePlayStateChange = (isPlaying: boolean) => {
    //     setVideoIsPlaying(isPlaying);
    // };

    const handleUpdatingPage = (page: number)=> {
        selectedIndex.current = page;
    }

    return(
        <Paper variant='outlined' sx={{ width: "100%" , padding: 2}}>
            <Box sx={{ width: "100%", height: "100%"}}>

                <ChartTimeHighlight
                    datasources={{
                        gamma: datasources.gamma,
                        neutron: datasources.neutron,
                        threshold: datasources.threshold
                    }}
                    modeType={mode}
                    eventData={eventData}
                    latestGB={latestGB}
                    currentTime={videoCurrentTime}
                />

            </Box>
            <Box sx={{ width: "100%", height: "100%"}}>

                <LaneVideoPlayback
                    videos={eventData?.videoFiles}
                    modeType={mode}
                    startTime={eventData.startTime}
                    endTime={eventData.endTime}
                    syncTime={videoCurrentTime}
                    isPlaying={videoIsPlaying}
                    onVideoTimeUpdate={handleVideoTimeUpdate}
                    onSelectedVideoIdxChange={handleUpdatingPage}
                />
            </Box>
                    {/*    <TimeController*/}
                    {/*        handleCommitChange={handleCommitChange}*/}
                    {/*        pause={handlePause}*/}
                    {/*        play={handlePlay}*/}
                    {/*        syncTime={syncTime}*/}
                    {/*        startTime={eventData.startTime}*/}
                    {/*        endTime={eventData.endTime}*/}
                    {/*        onTimeUpdate={handleTimeControllerUpdate}*/}
                    {/*        onPlayStateChange={handlePlayStateChange}*/}
                    {/*    />*/}


        </Paper>
    )
}