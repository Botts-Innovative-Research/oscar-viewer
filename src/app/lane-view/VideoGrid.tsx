"use client";

import {Box, Card, Grid, IconButton, Pagination, Stack, Typography } from '@mui/material';
import { useCallback, useContext, useEffect, useState } from 'react';
import "../style/cameragrid.css";
import { Datastream } from '@/lib/data/osh/Datastreams';
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

interface LaneVideoProps{
    laneName: string,
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid(props: LaneVideoProps) {

    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);

    // Create and connect alarm statuses
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [currentPage, setCurrentPage] = useState(0);
    const [slideDirection, setSlideDirection] = useState<"right"| "left"| undefined>("left");

    // Create and connect videostreams
    useEffect(() => {

        if(videoList == null || videoList.length == 0 && laneMap.size > 0) {
            let videos: LaneWithVideo[] = []

            laneMap.forEach((value, key) => {
                if(laneMap.has(key)) {
                    let ds: LaneMapEntry = laneMap.get(key);
                    const videoSources = ds.datasourcesRealtime.filter((item) => item.name.includes('Video') && item.name.includes('Lane'));
                    if(videoSources.length > 0 && key === props.laneName) {
                        const laneWithVideo: LaneWithVideo = {
                            // Get lane name
                            laneName: key,
                            // All video sources for the lane
                            videoSources: videoSources,
                        };

                        videos.push(laneWithVideo);
                    }
                }
            })
            setVideoList(videos);
        }
    }, [laneMap, props.laneName]);


    useEffect(() => {
        async function checkConnections() {
            if(videoList != null && videoList.length > 0) {
                // Connect to currently shown videostreams
                videoList.forEach(async (video) => {
                    let isConnected = false;
                    for (const src of video.videoSources) {
                        isConnected = await src.isConnected();

                        if(!isConnected) {
                            src.connect();
                        }
                    }
                });

                // Disconnect other videostreams
                videoList.forEach(async (video, index) => {
                    if(video && video.videoSources) {
                        let isConnected = false;
                        for (const src of video.videoSources) {
                            isConnected = await src.isConnected();

                            if(isConnected) {
                                src.disconnect();
                            }
                        }


                    }
                });
            }
        }

        checkConnections();

    }, [videoList]);

    const maxItems = 1; // Max number of videos per page
    const [page, setPage] = useState(1);  // Page currently selected
    const [startItem, setStartItem] = useState(0);  // Current start of range
    const [endItem, setEndItem] = useState(6); // Current end of range

    // Handle page value change
    const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        setStartItem(maxItems * (value - 1)); // Set startItem
        setEndItem(maxItems * (value - 1) + maxItems); // Set endItem to offset by maxItems
    };

    const handleNextPage = () =>{
        setSlideDirection("left");
        setCurrentPage((prevpage)=> prevpage+1)
    }

    const handlePrevPage = () =>{
        setSlideDirection("right");
        setCurrentPage((prevpage)=> prevpage - 1)
    }


    return (
        <>
            {videoList != null && (
                <Box sx={{display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center"}}>
                    <IconButton onClick={handlePrevPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === 0}>
                        <NavigateBeforeIcon/>
                    </IconButton>

                    <Stack spacing={2} direction="row" alignContent="center" justifyContent={"start"} sx={{height: '100%', padding: 2}}>
                        {videoList.slice(startItem, endItem).map((lane) => (
                            <VideoComponent id={lane.laneName} videoSources={lane.videoSources}/>
                        ))}
                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage >= Math.ceil((videoList.length/ maxItems) -1)}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}