"use client";

import React, {MutableRefObject, useEffect, useRef} from 'react';
import {INode} from "@/lib/data/osh/Node";
import Hls, {ErrorTypes} from "hls.js";
import {LiveVideoError} from "@/lib/data/Errors";

export default function HLSVideoComponent({videoSource, selectedNode}: {videoSource: string, selectedNode: INode}) {

    const videoRef = useRef(null);
    const hlsRef: MutableRefObject<Hls> = useRef(null);
    const MAX_RETRIES = 50;
    let currentRetry = 0;
    // send command to ffmpeg driver to start the video stream
    // returns the path the playlist file MU8 file
    // put that in teh video element perf
    // hls js

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current)
            return;

        const tls = selectedNode.isSecure ? "s" : "";
        const src = `http${tls}://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`

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
                hlsRef.current = hls;
                hls.on(Hls.Events.ERROR, function (event, data) {
                    // console.error("HLS error:", data);
                    console.warn("Failed to load manifest, attempting retry #" + currentRetry);
                    if (data.type == ErrorTypes.NETWORK_ERROR) {
                        if (data.error.message.includes("(status 404)")) {
                            // TODO implement here
                            console.log("Need to send startStream command again");
                        }
                        if (++currentRetry < MAX_RETRIES) {
                            setTimeout(() => {
                                hls.loadSource(src);
                                hls.startLoad();
                            }, 750);
                        } else {
                            const msg = "Error playing HLS stream:" + data.error.message;
                            console.error(msg);
                            throw new LiveVideoError(msg);
                        }
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

        return () => {
            if (hlsRef.current) {
                console.log("Unmounting HLS video component");
                hlsRef.current.destroy();
            }
        }

    }, [videoSource]);

    return (
        <video
            id="video"
            ref={videoRef}
            width="100%"
            height="500px"
        />
    )
}