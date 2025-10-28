"use client";

import {Box, Grid, Paper, Stack} from "@mui/material";
import React, {useContext, useEffect, useState} from "react";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import {generateHLSVideoCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isHLSVideoControlStream} from "@/lib/data/oscar/Utilities";
import HLSVideoComponent from "./HLSVideoComponent";
import IconButton from "@mui/material/IconButton";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';



export default function Media({datasources, currentLane}: {datasources: any, currentLane: string}) {

    const [chartReady, setChartReady] = useState<boolean>(false);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [videoSource, setVideoSource] = useState("");

    // send command to ffmpeg driver to start the video stream
    // returns the path the playlist file MU8 file
    // put that in teh video element perf
    // hls js

    useEffect(() => {
        sendStartHLSCommand();

        return () => {
            sendEndHLSCommand();
        }
    }, []);

    const sendStartHLSCommand = async() =>  {
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = await currLaneEntry.parentNode.fetchNodeControlStreams();

        let videoControlStream = streams.find((stream: typeof ControlStream) => isHLSVideoControlStream(stream));

        if (!videoControlStream){
            console.error("no video control stream");
            return;
        }

        const response = await sendCommand(
            currLaneEntry.parentNode,
            videoControlStream.properties.id,
            generateHLSVideoCommandJSON("startStream")
        )

        if(!response.ok) {
            console.log("failed to get live video stream to start")
            return;
        }

        let responseJson = await response.json();

        if (!responseJson)
            return;

        console.log(responseJson.results)

        let videoResults = responseJson?.results[0]?.data?.streamPath;
        if (videoResults != null)
            setVideoSource(videoResults);
    }


    const sendEndHLSCommand = async() =>  {
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let streams = await currLaneEntry.parentNode.fetchNodeControlStreams();

        let videoControlStream = streams.find((stream: typeof ControlStream) => isHLSVideoControlStream(stream));

        if (!videoControlStream){
            console.error("no video control stream");
            return;
        }

        const response = await sendCommand(
            currLaneEntry.parentNode,
            videoControlStream.properties.id,
            generateHLSVideoCommandJSON("endStream")
        )

        if(!response.ok) {
            console.log("Error: Failed to stop live stream of video!")
            return;
        }
    }

    useEffect(() => {

        async function connectDataSources(){
            if(!chartReady) return;

            datasources?.neutron?.disconnect();
            datasources?.gamma?.disconnect();
            datasources?.threshold?.disconnect();

            await datasources?.neutron?.connect();
            await datasources?.gamma?.connect();
            await datasources?.threshold?.connect();
        }

        connectDataSources();

        return () => {
            if(!chartReady){
                console.log("Media unmounted, cleaning up resources")
                datasources?.neutron?.disconnect();
                datasources?.gamma?.disconnect();
                datasources?.threshold?.disconnect();
            }
        };
    }, [datasources, chartReady]);

    const handleNextPage = () =>{

    }

    const handlePreviousPage = () =>{

    }

    return (
        <Paper variant='outlined' sx={{ width: "100%" }}>
            <Box sx={{flexGrow: 1, overflowX: "auto"}}>
                <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                    <Grid item xs={12} md={6}>
                        <ChartLane
                            laneName={currentLane}
                            setChartReady={setChartReady}
                            datasources={{
                                gamma: datasources.gamma,
                                neutron: datasources.neutron,
                                threshold: datasources.threshold,
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>

                        <Box sx={{
                            display: "flex",
                            flexWrap: "nowrap",
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <IconButton onClick={handlePreviousPage} sx={{margin: 2, cursor: 'pointer'}}>
                                <NavigateBeforeIcon/>
                            </IconButton>
                            <Stack
                                margin={0}
                                spacing={2}
                                direction="row"
                                alignContent="center"
                                justifyContent="center"
                                sx={{
                                    alignItems: "center",
                                    border: "1px solid rgba(0,0,0,0.12)",
                                    padding: 1,
                                    flexShrink: 0
                                }}
                            >
                                <HLSVideoComponent
                                    videoSource={videoSource}
                                    selectedNode={laneMapRef.current.get(currentLane).parentNode}
                                />
                            </Stack>

                            <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}}>
                                <NavigateNextIcon/>
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}
