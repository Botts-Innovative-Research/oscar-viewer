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
    const [hovered, setHovered] = useState(false);


    useEffect(() => {
        async function tryConnection() {
            if(videoSources.length > 0 && currentPage <= videoSources.length ){

                const currentVideo = videoSources[currentPage];

                //check if current video is connected (returns boolean)
                const isConnected = await currentVideo.isConnected();

                if(isConnected){
                    //if video is connected disconnect
                    currentVideo.disconnect();
                }
                console.log('Connecting to current video', currentVideo.name)
                currentVideo.connect();
            }
        }
        tryConnection();

    }, [currentPage, videoSources]);


    const handleNextPage = () =>{
        setCurrentPage((prevPage)=> {
            let nextPage = prevPage + 1
            if(videoSources && nextPage < videoSources.length){
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
            if(currpage >= 0){
                checkConnection(prevPage);
                return currpage;
            }else{
                return prevPage;
            }
        })
    }

    //next page -> disconnect from the previous page and connect to the next page if its not connected we can connect it
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
        <Box
            sx={{
                position: 'relative',
                height: '100%',
                width: '100%'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {videoSources.length > 1  &&  (

                <>
                    <StyledButtonWrapper $prev={true} $fullHeightHover={true} $next={false} >
                        <StyledIconButton
                            $alwaysVisible={false}
                            $fullHeightHover={true}
                            onClick={handlePrevPage}
                            disabled={currentPage === 0}>
                            <NavigateBeforeIcon sx={{ fontSize: '1.5rem' }} />
                        </StyledIconButton>
                    </StyledButtonWrapper>

                    <StyledButtonWrapper $prev={false} $next={true} $fullHeightHover={true} >
                        <StyledIconButton
                            $alwaysVisible={false}
                            $fullHeightHover={true}
                            onClick={handleNextPage}
                            disabled={currentPage === videoSources.length - 1}>
                            <NavigateNextIcon sx={{ fontSize: '1.5rem' }} />
                        </StyledIconButton>
                    </StyledButtonWrapper>
                </>

            )}


            <Stack direction="column" justifyContent="center">
                {videoSources.length > 0 && (
                    <VideoComponent
                        key={`${laneName}-${currentPage}`}
                        id={`${laneName}-${currentPage}`}
                        videoSources={[videoSources[currentPage]]}
                        currentPage={currentPage}
                    />
                )}
            </Stack>
        </Box>
    );

}
