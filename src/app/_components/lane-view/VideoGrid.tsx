"use client";

import {Box, IconButton, Paper, Stack } from '@mui/material';
import { useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource"
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";


export default function VideoGrid({videoDataSources}: {videoDataSources: typeof ConSysApi[]}) {

    const [dataSources, setDatasources] = useState<typeof ConSysApi[]>([]);

    const videoViewRef = useRef<typeof VideoView>();
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);
    const [maxPages, setMaxPages] = useState(0)

    const [videoHeight, setVideoHeight] = useState("380px");

    useEffect(() => {
        if(videoDataSources.length > 0 && videoDataSources){
            setDatasources(videoDataSources);
            setMaxPages(videoDataSources.length);
        }
    }, [videoDataSources]);


    useEffect(() => {
        if(dataSources.length > 0){
            videoViewRef.current = new VideoView({
                container: "lane-view-video",
                showTime: false,
                showStats: false,
                // useWebCodecApi: true,
                layers: [new VideoDataLayer({
                    dataSourceId: dataSources[selVideoIdx].id,
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.timestamp,
                })]
            });
        }

        return () => {
            if (videoViewRef.current) {
                videoViewRef.current.destroy();
                videoViewRef.current = undefined;
            }
        }

    }, [dataSources, selVideoIdx]);



    useEffect(() => {
        async function tryConnection(){
            if(dataSources && dataSources.length > 0 && selVideoIdx <= dataSources.length){
                const currentVideo = dataSources[selVideoIdx];

                const isConnected = await currentVideo.isConnected();
                if(isConnected){
                    await currentVideo.disconnect()
                }
                await currentVideo.connect();
                console.log('Videostream Connected: ', currentVideo.name)
            }
        }

        tryConnection();

    }, [dataSources, selVideoIdx]);

    const handleNextPage = () =>{

        setSelVidIdx((prevPage)=> {
            if (videoDataSources.length === 0) return 0;

            let nextPage = prevPage + 1

            disconnectLastVideo(prevPage)
            return nextPage < maxPages ? nextPage : prevPage;
        })
    }

    const handlePrevPage = () =>{
        setSelVidIdx((prevPage) => {
            disconnectLastVideo(prevPage)
            return prevPage > 0 ? prevPage -1 : prevPage;
        })

    }

    //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
    async function disconnectLastVideo (prevPage: number){
        if(prevPage >= 0){
            const isConnected = await dataSources[prevPage].isConnected();
            if(isConnected){
                await dataSources[prevPage].disconnect();
            }
        }
    }

    return (
        <>
            {dataSources != null && dataSources.length > 0 && (
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
                            alignItems: "center",
                            border: "1px solid rgba(0,0,0,0.12)",
                            padding: 1,
                            flexShrink: 0
                        }}
                    >
                        <Paper
                            key={dataSources[selVideoIdx].id}
                            id="lane-view-video"
                            sx={{
                                height: videoHeight
                            }}

                        ></Paper>
                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={selVideoIdx === maxPages-1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}