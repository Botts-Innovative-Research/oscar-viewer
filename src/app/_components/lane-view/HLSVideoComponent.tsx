"use client";

import React, {MutableRefObject, useCallback, useEffect, useRef, useState} from 'react';
import {INode} from "@/lib/data/osh/Node";
import Hls, {ErrorTypes} from "hls.js";
import {LiveVideoError} from "@/lib/data/Errors";
import {Box, Button} from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {attemptMediaPlayback} from "@/lib/media/MediaPlayback";

export default function HLSVideoComponent({
    videoSource,
    selectedNode,
    onManifestNotFound,
}: {
    videoSource: string,
    selectedNode: INode,
    onManifestNotFound?: () => void,
}) {
    const {t} = useLanguage();
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef: MutableRefObject<Hls | null> = useRef(null);
    const MAX_RETRIES = 50;
    let currentRetry = 0;

    const startPlayback = useCallback(async () => {
        if (!videoRef.current) {
            return;
        }

        const result = await attemptMediaPlayback(videoRef.current);
        if (result.status === "started") {
            setAutoplayBlocked(false);
        } else if (result.status === "blocked") {
            setAutoplayBlocked(true);
        } else if (result.status === "failed") {
            console.error("Unable to play HLS video", result.error);
        }
    }, []);

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current)
            return;

        const tls = selectedNode.isSecure ? "s" : "";
        const src = `http${tls}://${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${videoSource}`

        setAutoplayBlocked(false);

        const loadHls = async () => {
            if (typeof window === 'undefined') return;

            const Hls = (await import('hls.js')).default;

            const hlsjsConfig = {
                xhrSetup: function (xhr: XMLHttpRequest, url: string) {
                    const authHeader = selectedNode.getBasicAuthHeader().Authorization;
                    if (authHeader)
                        xhr.setRequestHeader("Authorization", authHeader);
                    xhr.setRequestHeader("Cache-Control", "no-cache");
                    xhr.withCredentials = true;
                },
            };


            if (Hls.isSupported()) {
                const hls = new Hls(hlsjsConfig);
                hlsRef.current = hls;
                hls.on(Hls.Events.ERROR, function (event, data) {
                    console.warn("Failed to load manifest, attempting retry #" + currentRetry);
                    if (data.type == ErrorTypes.NETWORK_ERROR) {
                        if (data.error.message.includes("(status 404)")) {
                            onManifestNotFound?.();
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
                    void startPlayback();
                });
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegURL')) {
                videoRef.current.src = src;
                void startPlayback();
            }
        };

        loadHls();

        return () => {
            if (hlsRef.current) {
                console.log("Unmounting HLS video component");
                hlsRef.current.destroy();
            }
        }

    }, [videoSource, selectedNode, onManifestNotFound, startPlayback]);

    return (
        <Box>
            <video
                id="video"
                ref={videoRef}
                width="100%"
                height="500px"
                autoPlay
                controls
                muted
                playsInline
            />
            {autoplayBlocked && (
                <Button onClick={() => void startPlayback()} variant="contained" fullWidth>
                    {t('play')}
                </Button>
            )}
        </Box>
    )
}
