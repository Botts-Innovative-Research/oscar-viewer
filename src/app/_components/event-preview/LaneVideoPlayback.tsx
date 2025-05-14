/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, { useEffect, useRef, useState} from "react";
import {Box, Grid, IconButton, Paper, Stack} from "@mui/material";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import '../../../Styles.css';


export class LaneVideoPlaybackProps {
    setVideoReady: Function;
    dataSynchronizer: typeof DataSynchronizer;
    modeType: string;
    onSelectedVideoIdxChange?: (index: number) =>void;
    setVideoView?: (videoView: typeof VideoView) => void;
}

export default function LaneVideoPlayback({setVideoReady, dataSynchronizer, modeType, onSelectedVideoIdxChange, setVideoView}: LaneVideoPlaybackProps) {
    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [localVideoReady, setLocalVideoReady] = useState<boolean>(false);

    const maxPages = dataSynchronizer.dataSynchronizer.dataSources.length;

    const [videoHeight, setVideoHeight] = useState("240px");

    useEffect(() => {
        if(modeType === 'detail'){
            setVideoHeight("320px")
        }else if (modeType=== 'preview'){
            setVideoHeight("240px")
        }
    }, [dataSynchronizer, modeType]);


    useEffect(() => {
        if (dataSynchronizer.dataSynchronizer.dataSources?.length > 0 && dataSynchronizer.dataSynchronizer.dataSources) {

            dataSynchronizer.dataSynchronizer.dataSources.forEach((ds: any) =>{
                videoViewRef.current = new VideoView({
                    container: `event-preview-video-${ds.id}`,
                    showStats: false,
                    showTime: false,
                    // useWebCodecApi: true,
                    layers: [new VideoDataLayer({
                        dataSourceId: ds.id,
                        getFrameData: (rec: any) => rec.img,
                        getTimestamp: (rec: any) => rec.timestamp,
                    })]
                });

                setVideoView(videoViewRef.current);
                console.log("video exists", videoViewRef)


            })
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
    }, [dataSynchronizer, selVideoIdx]);

    useEffect(() => {
        console.log("LaneVideoPlayback: ",  videoViewRef.current);
        console.log("LaneVideoPlayback Synchro: ", dataSynchronizer);
    }, [localVideoReady]);



    const handleNextPage = () =>{
        setSelVidIdx((prevPage)=> {
            if ( dataSynchronizer.dataSynchronizer.dataSources.length === 0) return 0;
            let nextPage = prevPage + 1
            const page = nextPage < maxPages ? nextPage : prevPage;
            onSelectedVideoIdxChange(page);
            return page;
        })
    }

    const handlePrevPage = () =>{
        setSelVidIdx((prevPage) => {
            const page = prevPage > 0 ? prevPage -1 : prevPage;

            onSelectedVideoIdxChange(page);
            return page;
        })
    }


    const startIdx = selVideoIdx * 1;
    const endIdx = startIdx + 1;

    const visibleVideo = dataSynchronizer.dataSynchronizer.dataSources.slice(startIdx, endIdx);

    return (
        <>
            { (

                <Box sx={{
                    display: "flex",
                    flexWrap: "nowrap",
                    justifyContent: "center",
                    alignItems: "center",
                }}>
                    <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === 0}>
                        <NavigateBeforeIcon/>
                    </IconButton>


                    <Stack
                        margin={0}
                        spacing={2}
                        direction="row"
                        alignContent="center"
                        justifyContent="center"

                        sx={{
                            height: videoHeight,
                            alignItems: "center",
                            border: "1px solid rgba(0,0,0,0.12)",
                            padding: 1,
                            flexShrink: 0
                        }}
                    >
                        {visibleVideo.map((ds: any) => (
                            <Paper
                                key={ds.id}
                                id={`event-preview-video-${ds.id}`}
                                sx={{
                                    height: videoHeight
                                }}
                            ></Paper>
                        ))}

                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === maxPages - 1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}
        </>

    )
}