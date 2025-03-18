/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, { useEffect, useRef, useState} from "react";
import {Box, Grid, IconButton, Stack} from "@mui/material";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import '../../../Styles.css';

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

    const [dataSources, setDatasources] = useState<typeof SweApi[]>([]);
    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [localVideoReady, setLocalVideoReady] = useState<boolean>(false);

    const [maxPages, setMaxPages] = useState(0);

    const [videoSize, setVideoSize] = useState("300px");

    useEffect(() => {
        if (videoDatasources.length > 0 && videoDatasources) {
            setDatasources(videoDatasources);
            setMaxPages(videoDatasources?.length);
        }

        if(modeType === 'detail'){
            setVideoSize("450px")
        }else if (modeType=== 'preview'){
            setVideoSize("275px")
        }
    }, [videoDatasources, modeType]);


    useEffect(() => {
        if (dataSources.length > 0 && dataSources[selVideoIdx]) {

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
            if (dataSources.length === 0) return 0;
            let nextPage = prevPage + 1
            return nextPage < maxPages ? nextPage : prevPage;
        })
    }

    const handlePrevPage = () =>{
        setSelVidIdx((prevPage) => {
            return prevPage > 0 ? prevPage -1 : prevPage;
        })
    }


    return (
        <>

            {dataSources != null && dataSources?.length > 0 && (

                <Box sx={{
                    display: "flex",
                    flexDirection: "row",
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
                            width: "100%",
                            height: "videoSize",
                            maxWidth: "100%",
                            maxHeight: videoSize,
                            alignItems: "center",
                            border: "1px solid rgba(0,0,0,0.12)",
                            padding: 1
                        }}
                    >
                        <Box
                            key={dataSources[selVideoIdx].id}
                            id="event-preview-video"
                            sx={{
                                width: "100%",
                                height: "100%",
                            }}
                        />
                    </Stack>



                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === maxPages-1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>

            )}
        </>

    )
}

