"use client";

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {INode} from "@/lib/data/osh/Node";
import {Box, Button, CircularProgress, Typography} from "@mui/material";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {attemptMediaPlayback} from "@/lib/media/MediaPlayback";
import {buildLiveVideoUrl} from "@/app/_components/lane-view/LiveVideoUtils";

const MAX_NETWORK_RETRIES = 40;
const MAX_MEDIA_RECOVERY_ATTEMPTS = 3;
const NETWORK_RETRY_DELAY_MS = 750;
const MEDIA_RECOVERY_DELAY_MS = 250;
const PREPARATION_TIMEOUT_MS = 45_000;

type PlaybackState = "preparing" | "playing" | "error";

interface HlsConstructor {
    new(config: Record<string, unknown>): HlsInstance;
    isSupported(): boolean;
    Events: {
        ERROR: string;
        MANIFEST_PARSED: string;
    };
}

interface HlsInstance {
    on(event: string, callback: (event: string, data?: any) => void): void;
    loadSource(source: string): void;
    attachMedia(media: HTMLMediaElement): void;
    startLoad(): void;
    stopLoad(): void;
    recoverMediaError(): void;
    swapAudioCodec(): void;
    destroy(): void;
}

interface HlsLibrary {
    default: HlsConstructor;
}

const loadHlsLibrary = () => import("hls.js") as Promise<unknown> as Promise<HlsLibrary>;

export default function HLSVideoComponent({
    videoSource,
    selectedNode,
    hlsLoader = loadHlsLibrary,
    onRetry,
}: {
    videoSource: string,
    selectedNode: INode,
    /** Dependency injection used by focused component tests. */
    hlsLoader?: () => Promise<HlsLibrary>,
    /** Requests one fresh server-side stream after a terminal playback error. */
    onRetry?: () => void,
}) {
    const {t} = useLanguage();
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [playbackState, setPlaybackState] = useState<PlaybackState>("preparing");
    const [retryGeneration, setRetryGeneration] = useState(0);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playbackAttemptRef = useRef(0);
    const playbackFailureRef = useRef<((message: string, error?: unknown) => void) | null>(null);
    const playbackAttemptStartedRef = useRef<(() => void) | null>(null);
    const autoplayBlockedHandlerRef = useRef<(() => void) | null>(null);

    const startPlayback = useCallback(async () => {
        if (!videoRef.current) {
            return;
        }

        playbackAttemptStartedRef.current?.();
        const attempt = ++playbackAttemptRef.current;
        const result = await attemptMediaPlayback(videoRef.current);
        if (attempt !== playbackAttemptRef.current)
            return;
        if (result.status === "started") {
            setAutoplayBlocked(false);
        } else if (result.status === "blocked") {
            setAutoplayBlocked(true);
            autoplayBlockedHandlerRef.current?.();
        } else if (result.status === "failed") {
            const failureHandler = playbackFailureRef.current;
            if (failureHandler)
                failureHandler("Unable to play HLS video", result.error);
            else
                setPlaybackState("error");
        }
    }, []);

    const retryPlayback = useCallback(() => {
        setAutoplayBlocked(false);
        setPlaybackState("preparing");
        if (onRetry)
            onRetry();
        else
            setRetryGeneration((generation) => generation + 1);
    }, [onRetry]);

    useEffect(() => {
        if (!videoSource || !selectedNode || !videoRef.current)
            return;

        const video = videoRef.current;
        const src = buildLiveVideoUrl(videoSource, selectedNode);
        let cancelled = false;
        let terminal = false;
        let hls: HlsInstance | null = null;
        let usingNativePlayback = false;
        let nativeLoadedMetadata: (() => void) | null = null;
        let nativeError: (() => void) | null = null;
        let networkRetryTimer: ReturnType<typeof setTimeout> | null = null;
        let mediaRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
        let preparationTimer: ReturnType<typeof setTimeout> | null = null;
        let networkRetries = 0;
        let mediaRecoveryAttempts = 0;
        let awaitingUserPlayback = false;

        setAutoplayBlocked(false);
        setPlaybackState("preparing");

        const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
            if (timer)
                clearTimeout(timer);
        };

        const clearRetryTimers = () => {
            clearTimer(networkRetryTimer);
            clearTimer(mediaRecoveryTimer);
            networkRetryTimer = null;
            mediaRecoveryTimer = null;
        };

        const failPlayback = (message: string, error?: unknown) => {
            if (cancelled || terminal)
                return;
            terminal = true;
            clearRetryTimers();
            clearTimer(preparationTimer);
            preparationTimer = null;
            setAutoplayBlocked(false);
            hls?.stopLoad();
            video.pause();
            if (usingNativePlayback) {
                video.removeAttribute("src");
                video.load();
            }
            console.error(message, error ?? "");
            setPlaybackState("error");
        };
        playbackFailureRef.current = failPlayback;

        const ensurePreparationTimeout = () => {
            if (preparationTimer || terminal || cancelled)
                return;
            preparationTimer = setTimeout(() => {
                preparationTimer = null;
                failPlayback("Timed out while preparing the HLS stream");
            }, PREPARATION_TIMEOUT_MS);
        };

        const markPreparing = () => {
            if (cancelled || terminal)
                return;
            setPlaybackState("preparing");
            if (!awaitingUserPlayback)
                ensurePreparationTimeout();
        };

        const resetNetworkRecovery = () => {
            networkRetries = 0;
            clearTimer(networkRetryTimer);
            networkRetryTimer = null;
        };

        const scheduleNetworkRetry = (retry: () => void, errorMessage: string) => {
            if (cancelled || terminal)
                return;
            markPreparing();
            if (networkRetryTimer)
                return;
            if (networkRetries >= MAX_NETWORK_RETRIES) {
                failPlayback("HLS network retries exhausted", errorMessage);
                return;
            }

            networkRetries++;
            console.warn(`HLS stream is not ready; retrying (${networkRetries}/${MAX_NETWORK_RETRIES})`, errorMessage);
            networkRetryTimer = setTimeout(() => {
                networkRetryTimer = null;
                if (!cancelled && !terminal)
                    retry();
            }, NETWORK_RETRY_DELAY_MS);
        };

        const handlePlaybackAttemptStarted = () => {
            awaitingUserPlayback = false;
            ensurePreparationTimeout();
        };

        const handleAutoplayBlocked = () => {
            awaitingUserPlayback = true;
            clearTimer(preparationTimer);
            preparationTimer = null;
        };
        playbackAttemptStartedRef.current = handlePlaybackAttemptStarted;
        autoplayBlockedHandlerRef.current = handleAutoplayBlocked;

        const handlePlaying = () => {
            if (cancelled || terminal)
                return;
            awaitingUserPlayback = false;
            resetNetworkRecovery();
            mediaRecoveryAttempts = 0;
            clearRetryTimers();
            clearTimer(preparationTimer);
            preparationTimer = null;
            setAutoplayBlocked(false);
            setPlaybackState("playing");
        };

        const handleWaiting = () => markPreparing();
        video.addEventListener("playing", handlePlaying);
        video.addEventListener("waiting", handleWaiting);
        ensurePreparationTimeout();

        const loadHls = async () => {
            if (typeof window === 'undefined') return;

            const HlsConstructor = (await hlsLoader()).default;
            if (cancelled || terminal)
                return;

            const playlistUrl = new URL(src, window.location.href);
            const hlsjsConfig = {
                xhrSetup: function (xhr: XMLHttpRequest, requestUrl: string) {
                    let isPlaylistOrigin = false;
                    try {
                        isPlaylistOrigin = new URL(requestUrl, playlistUrl).origin === playlistUrl.origin;
                    } catch {
                        // Malformed or non-HTTP resource URLs receive no node
                        // credentials and are left for hls.js to reject.
                    }

                    if (isPlaylistOrigin) {
                        const authHeader = selectedNode.getBasicAuthHeader().Authorization;
                        if (authHeader)
                            xhr.setRequestHeader("Authorization", authHeader);
                        xhr.setRequestHeader("Cache-Control", "no-cache");
                        xhr.withCredentials = true;
                    } else {
                        xhr.withCredentials = false;
                    }
                },
            };

            if (HlsConstructor.isSupported()) {
                hls = new HlsConstructor(hlsjsConfig);
                hls.on(HlsConstructor.Events.ERROR, (_event: string, data: any) => {
                    if (cancelled || terminal)
                        return;

                    const errorMessage = data?.error?.message || data?.details || "Unknown HLS error";
                    if (data?.type === "networkError" && data?.fatal) {
                        scheduleNetworkRetry(() => {
                            if (hls) {
                                hls.loadSource(src);
                                hls.startLoad();
                            }
                        }, errorMessage);
                        return;
                    }

                    if (data?.type === "mediaError" && data?.fatal) {
                        markPreparing();
                        if (mediaRecoveryTimer)
                            return;
                        if (mediaRecoveryAttempts >= MAX_MEDIA_RECOVERY_ATTEMPTS) {
                            failPlayback("HLS media recovery attempts exhausted", errorMessage);
                            return;
                        }

                        mediaRecoveryAttempts++;
                        mediaRecoveryTimer = setTimeout(() => {
                            mediaRecoveryTimer = null;
                            if (cancelled || terminal || !hls)
                                return;
                            if (mediaRecoveryAttempts === 2)
                                hls.swapAudioCodec();
                            hls.recoverMediaError();
                        }, MEDIA_RECOVERY_DELAY_MS * mediaRecoveryAttempts);
                        return;
                    }

                    if (data?.fatal)
                        failPlayback("Fatal HLS playback error", errorMessage);
                });

                hls.loadSource(src);
                hls.attachMedia(video);

                hls.on(HlsConstructor.Events.MANIFEST_PARSED, () => {
                    if (cancelled || terminal)
                        return;
                    resetNetworkRecovery();
                    mediaRecoveryAttempts = 0;
                    void startPlayback();
                });
            } else if (video.canPlayType('application/vnd.apple.mpegURL')) {
                usingNativePlayback = true;
                const loadNativeSource = () => {
                    if (cancelled || terminal)
                        return;
                    video.src = src;
                    video.load();
                };
                nativeLoadedMetadata = () => {
                    if (cancelled || terminal)
                        return;
                    resetNetworkRecovery();
                    void startPlayback();
                };
                nativeError = () => scheduleNetworkRetry(
                    loadNativeSource,
                    video.error?.message || "Native HLS stream is not ready",
                );
                video.addEventListener("loadedmetadata", nativeLoadedMetadata);
                video.addEventListener("error", nativeError);
                loadNativeSource();
            } else {
                failPlayback("HLS playback is not supported by this browser");
            }
        };

        void loadHls().catch((error) => {
            failPlayback("Unable to initialize HLS playback", error);
        });

        return () => {
            cancelled = true;
            playbackAttemptRef.current++;
            if (playbackFailureRef.current === failPlayback)
                playbackFailureRef.current = null;
            if (playbackAttemptStartedRef.current === handlePlaybackAttemptStarted)
                playbackAttemptStartedRef.current = null;
            if (autoplayBlockedHandlerRef.current === handleAutoplayBlocked)
                autoplayBlockedHandlerRef.current = null;
            clearRetryTimers();
            clearTimer(preparationTimer);
            video.removeEventListener("playing", handlePlaying);
            video.removeEventListener("waiting", handleWaiting);
            if (nativeLoadedMetadata)
                video.removeEventListener("loadedmetadata", nativeLoadedMetadata);
            if (nativeError)
                video.removeEventListener("error", nativeError);
            hls?.destroy();
            video.pause();
            video.removeAttribute("src");
            video.load();
        }

    }, [videoSource, selectedNode, retryGeneration, hlsLoader, startPlayback]);

    return (
        <Box sx={{position: "relative", width: "100%"}}>
            <video
                id="video"
                ref={videoRef}
                width="100%"
                height="500px"
                autoPlay
                controls
                muted
                playsInline
                style={{backgroundColor: "black"}}
            />
            {playbackState === "preparing" && (
                <Box
                    data-testid="live-video-preparing"
                    role="status"
                    aria-live="polite"
                    sx={{
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.72)",
                        color: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.5,
                        inset: 0,
                        justifyContent: "center",
                        position: "absolute",
                    }}
                >
                    <CircularProgress color="inherit" size={28}/>
                    <Typography align="center">{t("liveVideoPreparing")}</Typography>
                    {autoplayBlocked && (
                        <Button onClick={() => void startPlayback()} variant="contained">
                            {t("play")}
                        </Button>
                    )}
                </Box>
            )}
            {playbackState === "error" && (
                <Box
                    data-testid="live-video-error"
                    role="alert"
                    sx={{
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.82)",
                        color: "white",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        inset: 0,
                        justifyContent: "center",
                        position: "absolute",
                    }}
                >
                    <Typography align="center">{t("liveVideoPlaybackError")}</Typography>
                    <Button onClick={retryPlayback} variant="contained">
                        {t("retry")}
                    </Button>
                </Box>
            )}
        </Box>
    )
}
