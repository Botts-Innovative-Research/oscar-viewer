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

interface LaneVideoProps{
    laneName: string
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid(props: LaneVideoProps) {

    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
    const [currentPage, setCurrentPage] = useState(0);

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

        if(videoList && videoList.length > 0 && currentPage <= maxPages){
            const currentVideo = videoList[0].videoSources[currentPage];
            if(currentVideo.isConnected()){
                currentVideo.disconnect()
            }
            currentVideo.connect();
        }
    }, [videoList, currentPage, maxPages]);


    const handleNextPage = () =>{
        setCurrentPage((prevPage)=> {
            let nextPage = prevPage + 1
            if(videoList && videoList[0] && nextPage <= maxPages-1){
                checkConnection(prevPage);
                return nextPage;
            }else{
                return prevPage;
            }
        })
    }

    const handlePrevPage = () =>{
        setCurrentPage((prevPage) => {
            let currpage = prevPage - 1;
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
            {videoList != null && videoList.length > 0 && (
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
                        sx={{ padding: 2, width: '50%', height: '50', border: "solid", borderWidth: '1px', borderColor: "rgba(0, 0, 0, 0.12)"}}
                    >
                        <VideoComponent
                            key={videoList[0].videoSources[currentPage].name}
                            id={videoList[0].laneName}
                            currentPage={currentPage}
                            videoSources={[videoList[0].videoSources[currentPage]]}
                        />
                    </Stack>

                    <IconButton onClick={handleNextPage} sx={{margin: 2, cursor: 'pointer'}} disabled={currentPage === maxPages-1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            )}


        </>
    );
}
