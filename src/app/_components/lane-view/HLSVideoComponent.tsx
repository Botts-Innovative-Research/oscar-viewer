"use client";

import React, {useEffect, useRef} from 'react';
import {INode} from "@/lib/data/osh/Node";
import {ErrorTypes} from "hls.js";
import {LiveVideoError} from "@/lib/data/Errors";

export default function HLSVideoComponent({videoSource, selectedNode}: {videoSource: string, selectedNode: INode}) {

    const videoRef = useRef(null);

    // send command to ffmpeg driver to start the video stream
    // returns the path the playlist file MU8 file
    // put that in teh video element perf
    // hls js

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current)
            return;

        const tls = selectedNode.isSecure ? "s" : "";
        const src = `http${tls}://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`

        console.log("src: ", src);

        const loadHls = async () => {
            if (typeof window === 'undefined') return;

            const Hls = (await import('hls.js')).default;

            const encoded = btoa(`${selectedNode.auth.username}:${selectedNode.auth.password}`);


            const hlsjsConfig = {
                xhrSetup: function (xhr: XMLHttpRequest, url: string) {
                    xhr.setRequestHeader("Authorization", `Basic ${encoded}`);
                    xhr.setRequestHeader("Cache-Control", "no-cache");
                    xhr.withCredentials = true;
                },
            };


            if (Hls.isSupported()) {
                // const hls = new Hls();
                const hls = new Hls(hlsjsConfig);
                hls.on(Hls.Events.ERROR, function (event, data) {
                    // console.error("HLS error:", data);
                    console.warn("Failed to load manifest, attempting retry...")
                    if (data.type == ErrorTypes.NETWORK_ERROR) {
                        setTimeout(() => {
                            hls.loadSource(src);
                            hls.startLoad();
                        }, 500);
                    } else {
                        throw new LiveVideoError("Error playing HLS stream:" + data.error.message);
                    }
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

    }, []);

    return (
        <video
            id="video"
            ref={videoRef}
            width="100%"
            height="500px"
        />
    )
}