/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useCallback, useEffect, useRef, useState} from "react";
import {Box, IconButton, Typography} from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import '../../../Styles.css';
import CircularProgress from "@mui/material/CircularProgress";


export class LaneVideoPlaybackProps {
    selectedNode: any
    videos: string[]
    modeType: string;
    startTime?: string;
    endTime?: string;
    syncTime?: number;
    isPlaying?: boolean;
    onVideoTimeUpdate?: (timeMs: number) => void;
    onSelectedVideoIdxChange?: (index: number) => void;
}

export default function LaneVideoPlayback({selectedNode, videos, modeType, startTime, endTime, syncTime, isPlaying, onVideoTimeUpdate, onSelectedVideoIdxChange}: LaneVideoPlaybackProps) {
    const [videoHeight, setVideoHeight] = useState("320px");
    const videoRefs = useRef<HTMLVideoElement[]>([]);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [isUpdatingFromSlider, setIsUpdatingFromSlider] = useState(false);
    const [selVideoIdx, setSelVidIdx] = useState<number>(0);

    const [tls, setTls] = useState("");
    useEffect(() => {
        if(modeType === 'detail'){
            setVideoHeight("500px")
        }else if (modeType=== 'preview'){
            setVideoHeight("300px")
        }

        if (!selectedNode)
            return;

        let tls = selectedNode.isSecure ? 'https' : 'http';
        setTls(tls)

    }, [modeType, videos, selectedNode]);

    useEffect(() => {
        videoRefs.current.forEach(video => {
            if (video) {
                if (isPlaying) {
                    video.play();
                } else {
                    video.pause();
                }
            }
        });
    }, [isPlaying]);

    useEffect(() => {
        if (syncTime && startTime && endTime && !isUpdatingFromSlider) {
            const videoStart = new Date(startTime).getTime();
            const videoEnd = new Date(endTime).getTime();
            const videoDuration = videoEnd - videoStart;

            const relativePosition = (syncTime - videoStart) / videoDuration;

            videoRefs.current.forEach(video => {
                if (video && video.duration) {
                    const videoTime = relativePosition * video.duration;
                    if (Math.abs(video.currentTime - videoTime) > 0.5) {
                        video.currentTime = Math.max(0, Math.min(videoTime, video.duration));
                    }
                }
            });
        }
    }, [syncTime, startTime, endTime, isUpdatingFromSlider]);

    const handleTimeUpdate = (video: HTMLVideoElement) => {
        if (!startTime || !endTime || isUpdatingFromSlider) return;

        const eventStart = new Date(startTime).getTime();
        const eventEnd = new Date(endTime).getTime();
        const eventDuration = eventEnd - eventStart;

        if (video.duration) {
            const sliderPosition = video.currentTime / video.duration;

            const eventTimeMs = eventStart + (sliderPosition * eventDuration);

            onVideoTimeUpdate?.(eventTimeMs);
        }
    };

    const handleLoadedMetadata = (video: HTMLVideoElement) => {
        if (video.duration && videoDuration === 0) {
            setVideoDuration(video.duration);
        }
    };

    const handleVideoRef = useCallback((element: HTMLVideoElement | null, index: number) => {
        if (element) {
            videoRefs.current[index] = element;

            element.addEventListener('loadedmetadata', () => handleLoadedMetadata(element));
            element.addEventListener('timeupdate', () => handleTimeUpdate(element));

            element.muted = true;
            element.loop = false;
        }
    }, []);

    const handleNextPage = () => {
        setSelVidIdx((prevPage) => {
            let next = prevPage + 1;
            const max = videos.length - 1;
            const newPage = next <= max ? next : prevPage;
            onSelectedVideoIdxChange(newPage);
            return newPage;
        })
    };

    const handlePrevPage = () => {
        setSelVidIdx((prevPage) => {
           let page = prevPage > 0 ? prevPage - 1 : 0;
            onSelectedVideoIdxChange(page);
            return page;
        })
    };


    const startIdx = selVideoIdx * 1;
    const endIdx = startIdx + 1;
    const visibleVideo = videos?.slice(startIdx, endIdx);


    return (
        <Box sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
        }}>
            {videos?.length > 0 ? (
                <div style={{display: "flex"}}>
                    <IconButton
                        onClick={handlePrevPage}
                        sx={{margin: 2, cursor: 'pointer'}}
                        disabled={selVideoIdx === 0}
                    >
                        <NavigateBeforeIcon/>
                    </IconButton>

                    <Box>
                        {visibleVideo.map((video, index) => {
                            return (
                                <video
                                    key={index}
                                    ref={(el) => handleVideoRef(el, index)}
                                    width="100%"
                                    height={videoHeight}
                                    controls
                                    muted
                                    playsInline
                                >
                                    <source src={`${tls}://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${video.trim()}`} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            );
                        })}
                    </Box>

                    <IconButton
                        onClick={handleNextPage}
                        sx={{margin: 2, cursor: 'pointer'}}
                        disabled={selVideoIdx >= videos.length - 1}
                    >
                        <NavigateNextIcon/>
                    </IconButton>
                </div>
                )
                : (
                    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                        <Typography>No Video Available</Typography>
                    </Box>
                )}
        </Box>

    )
}