"use client"

import { useEffect, useRef, useState } from "react"
import VideoView from 'osh-js/source/core/ui/view/video/VideoView';
import VideoDataLayer from 'osh-js/source/core/ui/layer/VideoDataLayer';
import Box from "@mui/material/Box/Box";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import Button from "@mui/material/Button";

interface OSHVideoProps {
    currentPage?: number,
    id: string
    videoSources: typeof SweApi[]
}

export default function VideoComponent({id, currentPage, videoSources}: OSHVideoProps) {

    const hasRendered = useRef(false);
    const [videoView, setVideoView] = useState(null);
    const [videoDataSource, setVideoDataSource] = useState(videoSources[currentPage]);

    useEffect(() => {
        if(hasRendered.current) return;

        if(videoView == null && videoDataSource != null) {
            const view = new VideoView({
                container: id,
                showTime: false,
                showStats: false,
                layers: [new VideoDataLayer({
                    dataSourceId: [videoDataSource.getId()],
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.time,
                })]
            });
            setVideoView(view);
            hasRendered.current = true;
        }
        return () => {
            if (videoView) {
                videoView.destroy();
            }
        };
    }, []);

    return (
        <Box id={id} style={{width: "100%", height: "100%"}}/>
    )
}