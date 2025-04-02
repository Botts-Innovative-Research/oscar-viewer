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
import { isVideoDatastream } from '@/lib/data/oscar/Utilities';

interface LaneVideoProps{
    laneName: string
}
interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function VideoGrid(props: LaneVideoProps) {

    const {laneMapRef} = useContext(DataSourceContext);

    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const [maxPages, setMaxPages] = useState(0)
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const [dsVideo, setDsVideo] = useState([]);


    const datasourceSetup = useCallback(async () => {

        let laneDSMap = new Map<string, LaneDSColl>();
        let videoDs: any[] = [];

        for (let [laneid, lane] of laneMap.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];
                let laneDSColl = laneDSMap.get(laneid);

                if(isVideoDatastream(ds)) {
                    console.log("Video DS Found",ds);
                    videoDs.push(rtDS);
                }
            }
            setDsVideo(videoDs);
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);

    // Create and connect videostreams
    useEffect(() => {
        if(videoList == null || videoList.length == 0 && laneMap.size > 0) {
            let updatedVideos: LaneWithVideo[] = []

            laneMap.forEach((value, key) => {
                if (key === props.laneName) {
                    let ds: LaneMapEntry = laneMap.get(key);

                    dsVideo.forEach((dss) =>{
                        const videoSources = ds.datasourcesRealtime.filter((item) => item.properties.resource === (dss.properties.resource));
                        if(videoSources.length > 0){
                            let existingLane = updatedVideos.find((lane) => lane.laneName === key);
                            if (existingLane) {

                                existingLane.videoSources.push(...videoSources.filter((source) => !existingLane.videoSources.some((existingSource) => existingSource === source)));
                            } else {

                                updatedVideos.push({ laneName: key, videoSources });
                            }

                        }
                    })
                }
            });
            setVideoList(updatedVideos);

        }
    }, [laneMap, props.laneName, dsVideo]);


    useEffect(() => {
        if(videoList && videoList.length> 0){
            setMaxPages(videoList[0].videoSources.length);
        }
    }, [videoList]);


    useEffect(() => {

        async function tryConnection(){
            if(videoList && videoList.length > 0 && currentPage <= videoList.length){
                const currentVideo = videoList[0].videoSources[currentPage];

                const isConnected = await currentVideo.isConnected();
                if(isConnected){
                    currentVideo.disconnect()
                }
                console.log('Connecting to current video', currentVideo.name)
                currentVideo.connect();
            }
        }

        tryConnection();

    }, [videoList, currentPage]);


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

    useEffect(() => {
        console.log('video list in video grid', videoList)
    }, [videoList]);

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
