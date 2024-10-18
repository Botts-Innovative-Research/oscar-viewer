"use client";

import {Box, Card, Grid, IconButton, Pagination, Stack, Typography } from '@mui/material';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import VideoComponent from '../video/VideoComponent';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';


interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
// export default function VideoGrid(props: LaneVideoProps) {
export default function VideoGrid({laneName, videoSources}: LaneWithVideo) {
    const [currentPage, setCurrentPage] = useState(0);
    const [slideDirection, setSlideDirection] = useState<"right"| "left"| undefined>("left");
    // const [maxPages, setMaxPages] = useState(0)

    const maxPages= videoSources.length


    useEffect(() => {
        const currentVideo = videoSources[currentPage];
        if(currentVideo){
            currentVideo.isConnected().then((isConnected: boolean) =>{
                if(!isConnected){
                    currentVideo.connect()
                }
            })

            return () => {
                currentVideo.disconnect();
            }

        }
    }, [currentPage, videoSources]);

    // const handleNextPage = () => {
    //     if (currentPage < maxPages - 1) {
    //         setSlideDirection("left");
    //         setCurrentPage(currentPage + 1);
    //     }
    // };
    //
    // const handlePrevPage = () => {
    //     if (currentPage > 0) {
    //         setSlideDirection("right");
    //
    //         setCurrentPage(currentPage - 1);
    //     }
    // };

    useEffect(() => {
        let isConnected = false;
        if(videoSources && videoSources.length > 0 && currentPage <= videoSources.length - 1){
            console.log('connecting src', videoSources[currentPage].name);
            isConnected = videoSources[currentPage].isConnected()
            if(isConnected){
                console.log('iam connected already')
                videoSources[currentPage].disconnect();
            }
            videoSources[currentPage].connect();
        }
    }, [videoSources, currentPage]);

    const handleNextPage = () =>{
        setSlideDirection("left");
        setCurrentPage((prevPage)=> {
            let nextPage = prevPage + 1
            if(videoSources && videoSources[0] && nextPage <= maxPages-1){
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
            checkConnection(prevPage);
            return currpage;

        })
    }

    async function checkConnection (prevPage: number){
        if(prevPage >= 0){

            const isConnected = await videoSources[prevPage].isConnected();
            if(isConnected){
                console.log('disconnecting', videoSources[prevPage].name)
                videoSources[prevPage].disconnect();
            }
        }
    }


    return (
        <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <IconButton onClick={handlePrevPage} sx={{ margin: 1 }} disabled={currentPage === 0}>
                <NavigateBeforeIcon />
            </IconButton>

            <Stack spacing={2} direction="column" alignContent="center" justifyContent="center" sx={{ padding: 1}}>
                {videoSources.map((videoSrc, index) =>(
                    <VideoComponent key={`${laneName}-${index}`} id={`${laneName}-${index}`} videoSources={[videoSrc]} currentPage={index} />
                ))
                }
            </Stack>

            <IconButton onClick={handleNextPage} sx={{ margin: 1 }} disabled={currentPage >= maxPages - 1}>
                <NavigateNextIcon />
            </IconButton>
        </Box>

    );
}