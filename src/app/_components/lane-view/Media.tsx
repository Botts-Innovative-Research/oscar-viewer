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
import {LiveVideoError} from "@/lib/data/Errors";


export default function Media({datasources, currentLane}: {datasources: any, currentLane: string}) {

    const [chartReady, setChartReady] = useState<boolean>(false);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [videoSource, setVideoSource] = useState(null);
    const [videoStreams, setVideoStreams] = useState<typeof ControlStream[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        fetchVideoControlStreams()
    }, []);

    useEffect(() => {
        if (videoStreams.length === 0)
            return;

        const currentStream = videoStreams[currentPage];

        console.log("curr stream", currentStream);

        if (!currentStream)
            return;

        const startStream = async () => {
            const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

            const response = await sendCommand(currLaneEntry.parentNode, currentStream.properties.id, generateHLSVideoCommandJSON(true));

            if (!response.ok) {
                console.error("Failed to start stream");
                return;
            }

            const responseJson = await response.json();

            const streamPath = responseJson?.results?.[0]?.data?.streamPath;

            if (streamPath)
                setVideoSource(streamPath);
            console.log("response", responseJson)
            console.log("stream path", streamPath)
        }

        const stopPreviousStream = async () => {
            const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

            const prevStream = videoStreams[currentPage - 1];
            if (!prevStream)
                return;

            await sendCommand(currLaneEntry.parentNode, prevStream.properties.id, generateHLSVideoCommandJSON(false));
        }

        stopPreviousStream().then(startStream);

        return () => {
            sendCommand(laneMapRef.current.get(currentLane).parentNode, currentStream.properties.id, generateHLSVideoCommandJSON(false));
        }
    }, [currentPage, videoStreams]);

    const fetchVideoControlStreams = async () => {
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let videoControlStreams = currLaneEntry.controlStreams.filter((stream: typeof ControlStream) => isHLSVideoControlStream(stream));

        if (!videoControlStreams || videoControlStreams.length == 0){
            console.error("no video control stream");
            throw new LiveVideoError("No video control stream available.");
        }

        let uniqueVideoControlStreams = videoControlStreams.reduce((acc: typeof ControlStream[], stream: typeof ControlStream) => {
            const id = stream.properties?.id;
            if (!id) return acc;
            if (!acc.find(s => s.properties.id === id)) {
                acc.push(stream);
            }
            return acc;
        }, []);

        setVideoStreams(uniqueVideoControlStreams)
    }


    useEffect(() => {
        if (!datasources)
            return;

        async function connectDataSources(){
            await datasources?.neutron?.connect();
            await datasources?.gamma?.connect();
            await datasources?.threshold?.connect();
        }

        connectDataSources();

        return () => {
            if (datasources.neutron.isConnected())
                datasources.neutron.disconnect();

            if (datasources.gamma.isConnected())
                datasources.gamma.disconnect();

            if (datasources.threshold.isConnected())
                datasources.threshold.disconnect();
        }

    }, [datasources, currentLane]);

    const handleNextPage = () =>{
        if (currentPage < videoStreams.length - 1) {
            setCurrentPage(prev => prev + 1);
        }
    }

    const handlePreviousPage = () =>{
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1)
        }
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
                            <IconButton onClick={handlePreviousPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === 0}>
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
                                {videoSource && laneMapRef.current?.get(currentLane)?.parentNode && (
                                        <HLSVideoComponent
                                            videoSource={videoSource}
                                            selectedNode={laneMapRef.current.get(currentLane).parentNode}
                                        />
                                    )}
                            </Stack>

                            <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === videoStreams.length - 1}>
                                <NavigateNextIcon/>
                            </IconButton>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
}
