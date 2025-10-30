"use client";

import React, {useEffect, useRef} from 'react';
import {INode} from "@/lib/data/osh/Node";
import {ErrorTypes} from "hls.js";

export default function HLSVideoComponent({videoSource, selectedNode}: {videoSource: string, selectedNode: INode}) {

    const videoRef = useRef(null);
    const hlsRef = useRef<any>(null); // store the Hls instance

    // send command to ffmpeg driver to start the video stream
    // returns the path the playlist file MU8 file
    // put that in teh video element perf
    // hls js

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current) return;

        const src = selectedNode.isSecure
            ? `https://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`
            : `http://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`;

        let hls: any;

        const loadHls = async () => {
            if (typeof window === 'undefined') return;

            const Hls = (await import('hls.js')).default;

            const encoded = btoa(`${selectedNode.auth.username}:${selectedNode.auth.password}`);

            const hlsjsConfig = {
                xhrSetup: function (xhr: any) {
                    xhr.setRequestHeader("Authorization", `Basic ${encoded}`);
                    xhr.setRequestHeader("Cache-Control", "no-cache");
                    xhr.withCredentials = true;
                }
            };

            if (Hls.isSupported()) {
                hls = new Hls(hlsjsConfig);
                hlsRef.current = hls;

                hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                    // console.error("HLS error:", data);
                    console.warn("Failed to load manifest, attempting retry...")
                    if (data.type === ErrorTypes.NETWORK_ERROR) {
                        setTimeout(() => {
                            hls.loadSource(src);
                            hls.startLoad();
                        }, 500);
                    }
                });

                hls.loadSource(src);
                hls.attachMedia(videoRef.current);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoRef.current?.play().catch(() => { console.log("error playing video") });
                });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegURL')) {
                videoRef.current.src = src;
                videoRef.current.play().catch(() => { console.log("error playing video") });
            }
        };

        loadHls();

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [videoSource, selectedNode]);

    return (
        <video
            id="video"
            ref={videoRef}
            width="100%"
            style={{ backgroundColor: "black", maxHeight:"500px" }}
        />
    )
}