import {Avatar, Box, IconButton, Stack } from '@mui/material';
import { useState, useEffect } from 'react';
import "../../style/cameragrid.css";
import VideoComponent from './VideoComponent';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {ArrowCircleLeftOutlined, ArrowCircleRightOutlined } from '@mui/icons-material';
import {StyledButtonWrapper, StyledIconButton} from "@/app/_components/video/Video";


interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}


export default function VideoCarousel({ laneName, videoSources }: LaneWithVideo) {


    const [currentPage, setCurrentPage] = useState(0);
    // const [slideDirection, setSlideDirection] = useState<"right" | "left" | undefined>("left");
    const [hovered, setHovered] = useState(false); // New hover state

    const maxPages = videoSources.length;

    useEffect(() => {

        if(videoSources.length > 0){
            const currentVideo = videoSources[currentPage];
            if(!currentVideo){
                return;
            }

            currentVideo.connect();
            if(currentVideo.isConnected){
                console.log('video connected', currentVideo)
            }


            // checkConnection(currentPage-1).then(() => {
            //     currentVideo.connect();
            //     console.log('video connected', currentVideo)
            // })
        }

    }, [currentPage, videoSources]);

    async function checkConnection (prevPage: number){
        if(prevPage >= 0){

            const isConnected = await videoSources[prevPage].isConnected();
            if(isConnected){
                await videoSources[prevPage].disconnect();
                console.log('disconnected', videoSources[prevPage])
            }
        }
    }

    const handleNextPage = () => {
        setCurrentPage((prevPage) => {
            let nextPage = prevPage + 1;
            if(nextPage <= videoSources.length -1){
                checkConnection(prevPage)

                return nextPage;
            }else{
                return prevPage;
            }



        });
    };

    const handlePrevPage = () => {
        setCurrentPage((prevPage) => {
            let currpage = prevPage - 1;
            if(currpage >= 0){
                checkConnection(currpage + 1).then(() =>{
                    return currpage
                })
            }else{
                return 0
            }
        });
    };



    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {maxPages > 1 && currentPage !== 0 &&(
                <StyledButtonWrapper $prev={true} $fullHeightHover={true} $next={false}>
                    <StyledIconButton  $alwaysVisible={false} $fullHeightHover={true} onClick={handlePrevPage} disabled={currentPage === 0}>
                        <NavigateBeforeIcon sx={{fontSize: '1.5rem'}}/>
                    </StyledIconButton>
                </StyledButtonWrapper>

            )}


            {maxPages > 1 && (
                <StyledButtonWrapper  $prev={false} $next={true} $fullHeightHover={true}>
                    <StyledIconButton  $alwaysVisible={false} $fullHeightHover={true} onClick={handleNextPage} disabled={currentPage===maxPages}>
                        <NavigateNextIcon sx={{fontSize: '1.5rem'}}/>
                    </StyledIconButton>
                </StyledButtonWrapper>

            )}


            <Stack spacing={2} direction="column" alignContent="center" justifyContent="center" sx={{ padding: 1 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                {videoSources.map((videoSrc, index) => (

                    <VideoComponent key={`${laneName}-${index}`} id={`${laneName}-${index}`} videoSources={[videoSrc]} currentPage={index} />

                ))}
            </Stack>

        </Box>
    );
}
