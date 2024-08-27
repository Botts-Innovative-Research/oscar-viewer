"use client"

import { Datastream } from "@/lib/data/osh/Datastreams"
import { useEffect, useRef, useState } from "react"
import VideoView from 'osh-js/source/core/ui/view/video/VideoView';
import VideoDataLayer from 'osh-js/source/core/ui/layer/VideoDataLayer';
import Box from "@mui/material/Box/Box";
import {Mode} from 'osh-js/source/core/datasource/Mode';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import { Protocols } from "@/lib/data/Constants";

interface OSHVideoProps {
    videoDatastreams: Datastream[]
}

export default function VideoComponent(props: OSHVideoProps) {
    const videoRef = useRef(null);
    const [videoView, setVideoView] = useState(null);
    const [videoDataSource, setVideoDataSource] = useState(null);

    // console.error("Rendering video with videostream : " + props.videoDatastreams[0].name);

    useEffect(() => {
        // Generate SweApi object, layer, and video view and show it below

        // const source = props.datastream.generateSweApiObj({start: START_TIME, end: FUTURE_END_TIME});
        const source = new SweApi(props.videoDatastreams[0].name, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${props.videoDatastreams[0].id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            responseFormat: 'application/swe+binary',
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
        });
        source.connect();
        setVideoDataSource(source);
    }, []);

    useEffect(() => {
        if(videoView == null && videoDataSource != null) {
            
            const view = new VideoView({
                container: props.videoDatastreams[0].id,
                showTime: false,
                showStats: false,
                layers: [new VideoDataLayer({
                    dataSourceId: [videoDataSource.getId()],
                    getFrameData: (rec: any) => rec.img,
                    getTimestamp: (rec: any) => rec.time,
                })]
            });
            setVideoView(view);
        }
    }, [videoDataSource]);

    return (<>
        <Box id={props.videoDatastreams[0].id} ref={videoRef} style={{ width: "100%", height: "100%", }}/>
    </>)
}