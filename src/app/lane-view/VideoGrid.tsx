"use client";

import {Box, Card, Grid, IconButton, Pagination, Stack, Typography } from '@mui/material';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import "../style/cameragrid.css";
import { useSelector } from 'react-redux';
import { LaneDSColl, LaneMapEntry, LaneMeta } from '@/lib/data/oscar/LaneCollection';
import CameraGridVideo from '../_components/video/VideoComponent';
import { selectDatastreams } from '@/lib/state/OSHSlice';
import { selectLaneMap, selectLanes } from '@/lib/state/OSCARClientSlice';
import { RootState } from '@/lib/state/Store';
import VideoComponent from '../_components/video/VideoComponent';
import VideoStatusWrapper from '../_components/video/VideoStatusWrapper';
import {EventType} from 'osh-js/source/core/event/EventType';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import { Protocols } from "@/lib/data/Constants";
import {Mode} from 'osh-js/source/core/datasource/Mode';
import {DataSourceContext} from '../contexts/DataSourceContext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";

interface LaneVideoProps{
    laneName: string
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid(props: LaneVideoProps) {
    const idVal = useRef(1);
    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
    const maxItemsPerPage = 1;
    const [currentPage, setCurrentPage] = useState(0);
    const [slideDirection, setSlideDirection] = useState<"right"| "left"| undefined>("left");

    const [maxPages, setMaxPages] = useState(0)
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    // Create and connect videostreams
    useEffect(() => {
        if(videoList == null || videoList.length == 0 && laneMap.size > 0) {
            let videos: LaneWithVideo[] = []

            laneMap.forEach((value, key) => {
                if (key === props.laneName) {
                    let ds: LaneMapEntry = laneMap.get(key);

                    const videoSources = ds.datasourcesRealtime.filter((item) =>
                        item.name.includes('Video') && item.name.includes('Lane')
                    );

                    if (videoSources.length > 0) {
                        videos.push({laneName: key, videoSources});
                    }
                }
            });
            setVideoList(videos);

        }
    }, [laneMap, props.laneName]);

    useEffect(() => {
        if(videoList && videoList.length> 0){
            setMaxPages(videoList[0].videoSources.length);
        }
    }, [videoList]);


    useEffect(() => {
        console.log(videoList)
        let isConnected = false;
       if(videoList && videoList.length > 0 && currentPage <= videoList[0].videoSources.length - 1){
           console.log('connecting src', videoList[0].videoSources[currentPage].name);

           isConnected = videoList[0].videoSources[currentPage].isConnected()
           if(isConnected){
               console.log('iam connected already')
               videoList[0].videoSources[currentPage].disconnect();
           }
           videoList[0].videoSources[currentPage].connect();
       }
    }, [videoList, currentPage]);

    console.log('max', maxPages)

    const handleNextPage = () =>{
        setSlideDirection("left");
        setCurrentPage((prevPage)=> {
            let nextPage = prevPage + 1
            console.log('next page', nextPage);
            // checkConnection(prevPage);
            // return nextPage;
            if(videoList && videoList[0] && nextPage <= maxPages-1){
                checkConnection(prevPage);
                return nextPage;
            }else{
                return prevPage;
            }
        })
    }

    const handlePrevPage = () =>{
        setSlideDirection("right");
        setCurrentPage((prevPage) => {
            let currpage = prevPage - 1;
            console.log('prev page', currpage)
            checkConnection(prevPage);
            return currpage;

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
                        margin={0}
                        spacing={2}
                        direction="row"
                        alignContent="center"
                        justifyContent={"center"}
                        sx={{ padding: 2, width: '50%', height: '50'}}
                    >
                        {videoList.slice(currentPage, maxPages).map((lane) => (
                            <VideoComponent key={idVal.current++} id={lane.laneName} currentPage={currentPage} videoSources={lane.videoSources}/>
                        ))}

                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === maxPages-1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}
