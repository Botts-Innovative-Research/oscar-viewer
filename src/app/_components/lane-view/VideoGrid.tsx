"use client";

import {Box, Card, Grid, IconButton, Pagination, Stack, Typography } from '@mui/material';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import { useSelector } from 'react-redux';
import { LaneDSColl, LaneMapEntry, LaneMeta } from '@/lib/data/oscar/LaneCollection';
import CameraGridVideo from '../video/VideoComponent';
import { selectDatastreams } from '@/lib/state/OSHSlice';
import { selectLaneMap, selectLanes } from '@/lib/state/OSCARClientSlice';
import { RootState } from '@/lib/state/Store';
import VideoComponent from '../video/VideoComponent';
import VideoStatusWrapper from '../video/VideoStatusWrapper';
import {EventType} from 'osh-js/source/core/event/EventType';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import { Protocols } from "@/lib/data/Constants";
import {Mode} from 'osh-js/source/core/datasource/Mode';
import {DataSourceContext} from '../../contexts/DataSourceContext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";

interface VideoProps{
   videoList: LaneWithVideo[]
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid({videoList}: VideoProps) {
    const idVal = useRef(1);
    const [currentPage, setCurrentPage] = useState(0);
    const [slideDirection, setSlideDirection] = useState<"right"| "left"| undefined>("left");
    const [maxPages, setMaxPages] = useState(0)


    useEffect(() => {

        if(videoList && videoList.length > 0 && currentPage <= maxPages - 1){

            const currentVideo = videoList[0].videoSources[currentPage];
            const isConnected = currentVideo.isConnected();

            if(isConnected){
                currentVideo.disconnect();
            }
            currentVideo.connect();
        }

    }, [videoList, currentPage]);

    const handleNextPage = () => {
        if (currentPage < maxPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
    // async function checkConnection (prevPage: number){
    //     if(prevPage >= 0){
    //             const isConnected = await videoList.videoSources[prevPage].isConnected();
    //             if(isConnected){
    //                 videoList.videoSources[prevPage].disconnect();
    //             }
    //
    //
    //     }
    // }


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