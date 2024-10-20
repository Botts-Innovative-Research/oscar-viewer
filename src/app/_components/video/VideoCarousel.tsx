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
    const [slideDirection, setSlideDirection] = useState<"right" | "left" | undefined>("left");
    const [hovered, setHovered] = useState(false); // New hover state

    const maxPages = videoSources.length;

    useEffect(() => {
        const currentVideo = videoSources[currentPage];
        if (currentVideo) {
            currentVideo.isConnected().then((isConnected: boolean) => {
                if (!isConnected) {
                    currentVideo.connect();
                }
            });

            return () => {
                currentVideo.disconnect();
            };
        }
    }, [currentPage, videoSources]);

    const handleNextPage = () => {
        setSlideDirection("left");
        setCurrentPage((prevPage) => {
            let nextPage = prevPage + 1;
            if (videoSources && videoSources[0] && nextPage <= maxPages - 1) {
                checkConnection(prevPage);
                return nextPage;
            } else {
                return prevPage;
            }
        });
    };

    const handlePrevPage = () => {
        setSlideDirection("right");
        setCurrentPage((prevPage) => {
            let currpage = prevPage - 1;
            checkConnection(prevPage);
            return currpage;
        });
    };

    async function checkConnection(prevPage: number) {
        if (prevPage >= 0) {
            const isConnected = await videoSources[prevPage].isConnected();
            if (isConnected) {
                videoSources[prevPage].disconnect();
            }
        }
    }

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: 'auto'
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {maxPages > 1 && (
                <StyledButtonWrapper $prev={true} $fullHeightHover={true} $next={false}>
                    <StyledIconButton  $alwaysVisible={false} $fullHeightHover={true} onClick={handlePrevPage}>
                        <NavigateBeforeIcon sx={{fontSize: '1.5rem'}}/>
                    </StyledIconButton>
                </StyledButtonWrapper>

            )}


            {maxPages > 1 && (
                <StyledButtonWrapper  $prev={false} $next={true} $fullHeightHover={true}>
                    <StyledIconButton  $alwaysVisible={false} $fullHeightHover={true} onClick={handlePrevPage}>
                        <NavigateNextIcon sx={{fontSize: '1.5rem'}}/>
                    </StyledIconButton>
                </StyledButtonWrapper>

            )}


            <Stack spacing={2} direction="column" alignContent="center" justifyContent="center" sx={{ padding: 1 }}  onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                {videoSources.map((videoSrc, index) => (

                    <VideoComponent key={`${laneName}-${index}`} id={`${laneName}-${index}`} videoSources={[videoSrc]} currentPage={index} />

                ))}
            </Stack>

        </Box>
    );
}
