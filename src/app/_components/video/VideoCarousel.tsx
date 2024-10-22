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

    const maxPages = videoSources.length;

    useEffect(() => {

        if(videoSources.length > 0 && currentPage <= videoSources.length ){

            const currentVideo = videoSources[currentPage];

            if(currentVideo){
                if(currentVideo.isConnected()){
                    currentVideo.disconnect();
                }
                currentVideo.connect()
            }

        }

    }, [currentPage, videoSources]);

    async function disconnect (prevPage: number){
        if(prevPage >= 0){

            const isConnected = await videoSources[prevPage].isConnected();
            if(isConnected){
                await videoSources[prevPage].disconnect();
                console.log('disconnected', videoSources[prevPage])
            }
        }
    }


    const handleNextPage = () => {
        setCurrentPage((prevPage) => Math.min(prevPage + 1, maxPages - 1));
    };

    const handlePrevPage = () => {
        setCurrentPage((prevPage) => Math.max(prevPage - 1, 0));
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
            {maxPages > 1 && currentPage > 0 && (
                <StyledButtonWrapper $prev={true} $fullHeightHover={true} $next={false}>
                    <StyledIconButton $alwaysVisible={false} $fullHeightHover={true} onClick={handlePrevPage} disabled={currentPage === 0}>
                        <NavigateBeforeIcon sx={{ fontSize: '1.5rem' }} />
                    </StyledIconButton>
                </StyledButtonWrapper>
            )}

            {maxPages > 1 && (
                <StyledButtonWrapper $prev={false} $next={true} $fullHeightHover={true}>
                    <StyledIconButton $alwaysVisible={false} $fullHeightHover={true} onClick={handleNextPage} disabled={currentPage === maxPages - 1}>
                        <NavigateNextIcon sx={{ fontSize: '1.5rem' }} />
                    </StyledIconButton>
                </StyledButtonWrapper>
            )}

            <Stack spacing={2} direction="column" alignContent="center" justifyContent="center" sx={{ padding: 1 }}>
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
