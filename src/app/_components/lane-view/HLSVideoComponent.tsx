"use client";

import React, {useEffect, useRef} from 'react';

export default function HLSVideoComponent({videoSource, selectedNode}: {videoSource: string, selectedNode: any}) {

    const videoRef = useRef(null);

    // send command to ffmpeg driver to start the video stream
    // returns the path the playlist file MU8 file
    // put that in teh video element perf
    // hls js

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current)
            return;

        const src = selectedNode.isSecure
            ? `https://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`
            : `http://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`

        // if (Hls.isSupported()) {
        //     const hls = new Hls();
        //     hls.loadSource(src);
        //     hls.attachMedia(videoRef.current);
        // }
        // else if (videoRef.current.canPlayType('application/vnd.apple.mpegURL')) {
        //     videoRef.current.src = src;
        // }

        const loadHls = async () => {
            if (typeof window === 'undefined') return;

            const Hls = (await import('hls.js')).default;

            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(src);
                hls.attachMedia(videoRef.current!);
            } else if (videoRef.current!.canPlayType('application/vnd.apple.mpegURL')) {
                videoRef.current!.src = src;
            }
        };

        loadHls();

    }, [videoSource, selectedNode]);

    return (
        <video
            id="video"
            ref={videoRef}
            width="100%"
            height="500px"
            controls
        />
    )
}