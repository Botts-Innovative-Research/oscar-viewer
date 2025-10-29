"use client";

import React, {useEffect, useRef} from 'react';
import {INode} from "@/lib/data/osh/Node";

export default function HLSVideoComponent({videoSource, selectedNode}: {videoSource: string, selectedNode: INode}) {

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

            const encoded = btoa(`${selectedNode.auth.username}:${selectedNode.auth.password}`);


            var hlsjsConfig = {
                xhrSetup: function(xhr: any, url: any) {
                    xhr.setRequestHeader("Authorization", `Basic ${encoded}`);
                    xhr.withCredentials = true;
                }
            }


            if (Hls.isSupported()) {
                // const hls = new Hls();
                const hls = new Hls(hlsjsConfig);
                hls.on(Hls.Events.ERROR, function (event, data) {
                    console.error("HLS error:", data);
                });

                hls.loadSource(src);
                hls.attachMedia(videoRef.current);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoRef.current?.play();
                });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegURL')) {
                videoRef.current.src = src;
                videoRef.current.play();
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
        />
    )
}