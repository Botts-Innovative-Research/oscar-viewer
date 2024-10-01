"use client";

import {Box, Card, Grid, IconButton, Pagination, Stack, Typography } from '@mui/material';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import "../style/cameragrid.css";
import { Datastream } from '@/lib/data/osh/Datastreams';
import { useSelector } from 'react-redux';
import { LaneDSColl, LaneMapEntry, LaneMeta } from '@/lib/data/oscar/LaneCollection';
import CameraGridVideo from './video/VideoComponent';
import { selectDatastreams } from '@/lib/state/OSHSlice';
import { selectLaneMap, selectLanes } from '@/lib/state/OSCARClientSlice';
import { RootState } from '@/lib/state/Store';
import VideoComponent from './video/VideoComponent';
import VideoStatusWrapper from './video/VideoStatusWrapper';
import {EventType} from 'osh-js/source/core/event/EventType';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import { Protocols } from "@/lib/data/Constants";
import {Mode} from 'osh-js/source/core/datasource/Mode';
import {DataSourceContext} from '../contexts/DataSourceContext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface LaneVideoProps{
    laneName: string,
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid(props: LaneVideoProps) {
    const idVal = useRef(1);
    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
    const maxItems = 1;
    const [currentPage, setCurrentPage] = useState(0);
    const [slideDirection, setSlideDirection] = useState<"right"| "left"| undefined>("left");
    const [maxPages, setMaxPages] = useState(0);


    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    // Create and connect videostreams
    useEffect(() => {
        if(videoList == null || videoList.length == 0 && laneMap.size > 0) {
            let videos: LaneWithVideo[] = []

            laneMap.forEach((value, key) => {
                if(key === props.laneName){
                    let ds: LaneMapEntry = laneMap.get(key);

                    const videoSources = ds.datasourcesRealtime.filter((item) =>
                        item.name.includes('Video') && item.name.includes('Lane')
                    );

                    if(videoSources.length > 0) {
                        videos.push({laneName: key, videoSources});
                    }
                }
            });
            setVideoList(videos);
        }
    }, [laneMap, props.laneName]);


    //this will connect next video
    useEffect(() => {
       if(videoList && videoList.length > 0){

           videoList[0].videoSources[currentPage].connect();
           console.log('connecting src', videoList[0].videoSources[currentPage].name);
           setMaxPages(videoList[0].videoSources.length);
       }
    }, [videoList, currentPage]);


    const handleNextPage = () =>{
        setSlideDirection("left");
        setCurrentPage((prevPage)=> {
            let currentPage = prevPage + 1
            console.log('next page', currentPage);
            checkConnection(prevPage);
            return currentPage;
        })

    }

    const handlePrevPage = () =>{
        setSlideDirection("right");
        setCurrentPage((prevPage) => {
            let currentPage = prevPage - 1;
            console.log('prev page', currentPage)
            checkConnection(prevPage);
            return currentPage;
        })

    }

    //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
    async function checkConnection (prevPage: number){
        if(prevPage >= 0){
            for (const video of videoList) {
                const isConnected = await video.videoSources[prevPage].isConnected();
                if(isConnected){
                    console.log('disconnecting', video.videoSources[prevPage].name)
                    video.videoSources[prevPage].disconnect();
                }

            }
        }
    }


    return (
        <>
            {videoList != null && (
                <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
                    <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === 0}>
                        <NavigateBeforeIcon/>
                    </IconButton>

                    <Stack
                        spacing={2}
                        direction="row"
                        alignContent="center"
                        justifyContent={"start"}
                        sx={{height: '100%', padding: 2}}
                    >
                        {videoList.map((lane) => (
                            <VideoComponent key={idVal.current++} id={lane.laneName} currentPage={currentPage} videoSources={lane.videoSources}/>
                        ))}

                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === maxPages}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}