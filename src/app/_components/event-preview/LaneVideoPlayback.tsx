/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useAppDispatch} from "@/lib/state/Hooks";
import React, {useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Box, Grid, IconButton, Stack, Typography} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import VideoComponent from "@/app/_components/video/VideoComponent";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export class LaneVideoPlaybackProps {
    videoDatasources: typeof SweApi[];
    setVideoReady: Function;
    dataSynchronizer: typeof DataSynchronizer;
    addDataSource: Function;
    modeType: string;
}

export default function LaneVideoPlayback({
                                              videoDatasources,
                                              setVideoReady,
                                              dataSynchronizer,
                                              addDataSource,
                                              modeType
                                          }: LaneVideoPlaybackProps) {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [dataSources, setDatasources] = useState<typeof SweApi[]>([]);
    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [localVideoReady, setLocalVideoReady] = useState<boolean>(false);

    const [maxPages, setMaxPages] = useState(0);

    const [videoSize, setVideoSize] = useState("300px");

    useEffect(() => {
        setDatasources(videoDatasources);
        setMaxPages(videoDatasources.length)

        if(modeType === 'detail'){
            setVideoSize("500px")
        }else if (modeType=== 'preview'){
            setVideoSize("300px")
        }
    }, [videoDatasources]);


    useEffect(() => {
        if (dataSources[selVideoIdx]) {

            addDataSource(selVideoIdx);

            videoViewRef.current = new VideoView({
                container: "event-preview-video",
                showStats: false,
                showTime: false,
                layers: [new VideoDataLayer({
                    dataSourceId: dataSources[selVideoIdx].id,
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.timestamp,
                })]
            });
            setVideoReady(true);
            setLocalVideoReady(true);
        } else {
            setVideoReady(false);
            setLocalVideoReady(false);
        }

        return () => {
            if (videoViewRef.current) {
                videoViewRef.current.destroy();
                videoViewRef.current = undefined;
            }
        }
    }, [dataSources, selVideoIdx]);

    useEffect(() => {
        console.log("LaneVideoPlayback: ", dataSources[selVideoIdx], videoViewRef.current);
        console.log("LaneVideoPlayback Synchro: ", dataSynchronizer);
    }, [localVideoReady]);





    const handleNextPage = () =>{

        setSelVidIdx((prevPage)=> {
            let nextPage = prevPage + 1

            if(dataSources && dataSources[0] && nextPage <= maxPages - 1){
                return nextPage;
            }else{
                return prevPage;
            }
        })
    }

    const handlePrevPage = () =>{
        setSelVidIdx((prevPage) => {
            let currpage = prevPage - 1;
            return currpage;
        })
    }


    return (
        <>

        {dataSources != null && dataSources.length > 0 && (

            <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
                <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === 0}>
                    <NavigateBeforeIcon/>
                </IconButton>

                <Stack
                    margin={0}
                    spacing={2}
                    direction="row"
                    alignContent="center"
                    justifyContent={"center"}
                    sx={{ padding: 2, width: '100%', height: {videoSize}, border: "solid", borderWidth: '1px', borderColor: "rgba(0, 0, 0, 0.12)"}}
                >
                    <Grid item key={dataSources[selVideoIdx].id} id="event-preview-video"></Grid>
                </Stack>

                <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === maxPages-1}>
                    <NavigateNextIcon/>
                </IconButton>
            </Box>

            )}
        </>

    )
}