"use client";

import BrokenImageRoundedIcon from "@mui/icons-material/BrokenImageRounded";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useLanguage} from "@/app/contexts/LanguageContext";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import {
    fetchRetainedEventMedia,
    fetchRetainedMediaAsset,
    RetainedEventMediaResponse,
    RetainedFramePosition,
    RetainedMediaAssetResponse,
    RetainedMediaFetch,
    RetainedMediaNode,
    RetainedMediaSetResponse,
} from "@/lib/media/RetainedMedia";

type LookupState =
    | {kind: "loading"}
    | {kind: "legacy"}
    | {kind: "retained"; response: RetainedEventMediaResponse}
    | {kind: "error"};

type FrameLoadState = {
    status: "idle" | "loading" | "ready" | "error";
    url?: string;
};

const RETAINED_MEDIA_REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_RETAINED_FRAME_REQUESTS = 3;

type FrameRequestScheduler = <T>(
    request: () => Promise<T>,
    signal: AbortSignal,
) => Promise<T>;

function abortError(): Error {
    const error = new Error("Retained frame request was aborted");
    error.name = "AbortError";
    return error;
}

/** Bounds frame downloads across all camera galleries for one event. */
export function createRetainedFrameRequestScheduler(
    concurrency = MAX_CONCURRENT_RETAINED_FRAME_REQUESTS,
): FrameRequestScheduler {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1)
        throw new Error("Retained frame request concurrency must be a positive integer");
    let active = 0;
    const queue: Array<{
        cancelled: boolean;
        run: () => void;
    }> = [];
    const drain = () => {
        while (active < concurrency && queue.length > 0) {
            const entry = queue.shift()!;
            if (entry.cancelled) continue;
            active += 1;
            entry.run();
        }
    };
    return <T,>(request: () => Promise<T>, signal: AbortSignal): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            if (signal.aborted) {
                reject(abortError());
                return;
            }
            const entry = {
                cancelled: false,
                run: () => {
                    signal.removeEventListener("abort", cancelQueued);
                    request().then(resolve, reject).finally(() => {
                        active -= 1;
                        drain();
                    });
                },
            };
            const cancelQueued = () => {
                entry.cancelled = true;
                reject(abortError());
            };
            signal.addEventListener("abort", cancelQueued, {once: true});
            queue.push(entry);
            drain();
        });
}

interface LegacyVideoProps {
    selectedNode: RetainedMediaNode;
    videos?: string[];
    modeType: string;
    startTime?: string;
    endTime?: string;
    isPlaying?: boolean;
    syncTime: number;
    onVideoTimeUpdate?: (timeMs: number) => void;
    onSelectedVideoIdxChange?: (index: number) => void;
}

export interface RetainedEventMediaProps extends LegacyVideoProps {
    eventId?: string | null;
    fetchImpl?: RetainedMediaFetch;
}

const POSITION_KEYS: Record<RetainedFramePosition, string> = {
    FIRST: "retainedMediaPositionFirst",
    QUARTER: "retainedMediaPositionQuarter",
    MIDDLE: "retainedMediaPositionMiddle",
    THREE_QUARTERS: "retainedMediaPositionThreeQuarters",
    LAST: "retainedMediaPositionLast",
};

function isAbortError(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "name" in error
        && (error as {name?: unknown}).name === "AbortError");
}

export function formatRetainedVideoTimestamp(seconds: number): string {
    const sign = seconds < 0 ? "−" : "";
    const milliseconds = Math.round(Math.abs(seconds) * 1000);
    const hours = Math.floor(milliseconds / 3_600_000);
    const minutes = Math.floor(milliseconds / 60_000) % 60;
    const wholeSeconds = Math.floor(milliseconds / 1000) % 60;
    const remainder = milliseconds % 1000;
    const hoursPrefix = hours > 0 ? `${hours.toString().padStart(2, "0")}:` : "";
    return `${sign}${hoursPrefix}${minutes.toString().padStart(2, "0")}`
        + `:${wholeSeconds.toString().padStart(2, "0")}.${remainder.toString().padStart(3, "0")}`;
}

function frameEventTime(
    mediaSet: RetainedMediaSetResponse,
    frame: RetainedMediaAssetResponse,
    startTime?: string,
    endTime?: string,
): number | null {
    const start = startTime ? Date.parse(startTime) : Number.NaN;
    const end = endTime ? Date.parse(endTime) : Number.NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        return null;
    const first = mediaSet.assets[0].asset.sourcePtsSeconds;
    const last = mediaSet.assets[mediaSet.assets.length - 1].asset.sourcePtsSeconds;
    if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first)
        return start;
    const fraction = Math.max(0, Math.min(1,
        (frame.asset.sourcePtsSeconds - first) / (last - first)));
    return start + fraction * (end - start);
}

function LegacyVideo(props: LegacyVideoProps) {
    return (
        <LaneVideoPlayback
            selectedNode={props.selectedNode}
            videos={props.videos || []}
            modeType={props.modeType}
            startTime={props.startTime}
            endTime={props.endTime}
            isPlaying={props.isPlaying}
            syncTime={props.syncTime}
            onVideoTimeUpdate={props.onVideoTimeUpdate}
            onSelectedVideoIdxChange={props.onSelectedVideoIdxChange}
        />
    );
}

function CameraGallery({
    eventId,
    mediaSet,
    node,
    fetchImpl,
    scheduleRequest,
    onSelect,
}: {
    eventId: string;
    mediaSet: RetainedMediaSetResponse;
    node: RetainedMediaNode;
    fetchImpl: RetainedMediaFetch;
    scheduleRequest: FrameRequestScheduler;
    onSelect: (frame: RetainedMediaAssetResponse) => void;
}) {
    const {t} = useLanguage();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [retryGeneration, setRetryGeneration] = useState(0);
    const [frames, setFrames] = useState<FrameLoadState[]>(() =>
        mediaSet.assets.map(() => ({status: "idle"})));
    const objectUrls = useRef<Map<number, string>>(new Map());

    useEffect(() => {
        const urls = objectUrls.current;
        urls.forEach(url => URL.revokeObjectURL(url));
        urls.clear();
        setSelectedIndex(0);
        setFrames(mediaSet.assets.map(() => ({status: "idle"})));
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, [eventId, fetchImpl, mediaSet, node]);

    useEffect(() => {
        if (objectUrls.current.has(selectedIndex)) return;
        const controller = new AbortController();
        let cancelled = false;
        let timedOut = false;
        const timeout = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, RETAINED_MEDIA_REQUEST_TIMEOUT_MS);
        const asset = mediaSet.assets[selectedIndex];
        setFrames(previous => previous.map((frame, index) =>
            index === selectedIndex ? {status: "loading"} : frame));

        const failFrame = (error: unknown) => {
            if (cancelled || (isAbortError(error) && !timedOut)) return;
            console.error("Unable to load retained event frame", error);
            setFrames(previous => previous.map((frame, frameIndex) =>
                frameIndex === selectedIndex ? {status: "error"} : frame));
        };
        scheduleRequest(
            () => fetchRetainedMediaAsset(asset, eventId, node, fetchImpl, controller.signal),
            controller.signal,
        ).then(blob => {
            window.clearTimeout(timeout);
            if (cancelled) return;
            if (timedOut) {
                failFrame(new Error("Retained frame request timed out"));
                return;
            }
            try {
                const url = URL.createObjectURL(blob);
                objectUrls.current.set(selectedIndex, url);
                setFrames(previous => previous.map((frame, frameIndex) =>
                    frameIndex === selectedIndex ? {status: "ready", url} : frame));
            } catch (error) {
                failFrame(error);
            }
        }, error => {
            window.clearTimeout(timeout);
            failFrame(error);
        });

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [eventId, fetchImpl, mediaSet, node, retryGeneration, scheduleRequest, selectedIndex]);

    const markDecodeFailure = useCallback((index: number) => {
        setFrames(previous => previous.map((frame, frameIndex) =>
            frameIndex === index ? {status: "error"} : frame));
    }, []);

    const selectFrame = useCallback((index: number) => {
        const bounded = Math.max(0, Math.min(mediaSet.assets.length - 1, index));
        setSelectedIndex(bounded);
        onSelect(mediaSet.assets[bounded]);
    }, [mediaSet.assets, onSelect]);

    const selectedAsset = mediaSet.assets[selectedIndex];
    const selectedFrame = frames[selectedIndex] || {status: "idle"};
    const position = t(POSITION_KEYS[selectedAsset.asset.position]);
    const timestamp = formatRetainedVideoTimestamp(selectedAsset.asset.sourcePtsSeconds);
    const frameAlt = t("retainedMediaFrameAlt", {
        camera: mediaSet.manifest.cameraUid,
        position,
        ordinal: selectedAsset.asset.sourceFrameOrdinal,
        timestamp,
    });

    return (
        <Paper
            variant="outlined"
            sx={{p: 1.5, minWidth: 0}}
            data-testid="retained-media-camera"
            aria-label={t("retainedMediaCameraLabel", {camera: mediaSet.manifest.cameraUid})}
        >
            <Stack spacing={1.25}>
                <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    sx={{overflowWrap: "anywhere"}}
                    data-testid="retained-media-camera-label"
                >
                    {t("retainedMediaCameraLabel", {camera: mediaSet.manifest.cameraUid})}
                </Typography>

                <Box sx={{display: "flex", alignItems: "center", minHeight: 220}}>
                    <IconButton
                        aria-label={t("retainedMediaPreviousFrame")}
                        disabled={selectedIndex === 0}
                        onClick={() => selectFrame(selectedIndex - 1)}
                    >
                        <NavigateBeforeIcon/>
                    </IconButton>
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            minHeight: 220,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "action.hover",
                        }}
                    >
                        {selectedFrame.status === "loading" || selectedFrame.status === "idle" ? (
                            <Stack alignItems="center" spacing={1} role="status">
                                <CircularProgress size={30}/>
                                <Typography variant="body2">{t("retainedMediaFrameLoading")}</Typography>
                            </Stack>
                        ) : selectedFrame.status === "error" ? (
                            <Alert
                                severity="warning"
                                data-testid="retained-media-frame-error"
                                action={(
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() => setRetryGeneration(value => value + 1)}
                                    >
                                        {t("retry")}
                                    </Button>
                                )}
                            >
                                {t("retainedMediaFrameUnavailable")}
                            </Alert>
                        ) : (
                            <Box
                                component="img"
                                src={selectedFrame.url}
                                alt={frameAlt}
                                onError={() => markDecodeFailure(selectedIndex)}
                                data-testid="retained-media-main-image"
                                sx={{
                                    display: "block",
                                    maxWidth: "100%",
                                    maxHeight: 420,
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                }}
                            />
                        )}
                    </Box>
                    <IconButton
                        aria-label={t("retainedMediaNextFrame")}
                        disabled={selectedIndex >= mediaSet.assets.length - 1}
                        onClick={() => selectFrame(selectedIndex + 1)}
                    >
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>

                <Typography variant="body2" data-testid="retained-media-frame-metadata">
                    {position} — {t("retainedMediaFrameMetadata", {
                        ordinal: selectedAsset.asset.sourceFrameOrdinal,
                        timestamp,
                    })}
                </Typography>

                <Box
                    component="ul"
                    aria-label={t("retainedMediaFrameList", {camera: mediaSet.manifest.cameraUid})}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                        gap: 0.75,
                        listStyle: "none",
                        p: 0,
                        m: 0,
                    }}
                >
                    {mediaSet.assets.map((asset, index) => {
                        const frame = frames[index] || {status: "idle"};
                        const framePosition = t(POSITION_KEYS[asset.asset.position]);
                        const frameTimestamp = formatRetainedVideoTimestamp(asset.asset.sourcePtsSeconds);
                        const label = t("retainedMediaSelectFrame", {
                            position: framePosition,
                            ordinal: asset.asset.sourceFrameOrdinal,
                            timestamp: frameTimestamp,
                        });
                        return (
                            <Box component="li" key={asset.path} sx={{minWidth: 0}}>
                                <ButtonBase
                                    component="button"
                                    aria-label={label}
                                    aria-pressed={selectedIndex === index}
                                    data-testid="retained-media-thumbnail"
                                    onClick={() => selectFrame(index)}
                                    sx={{
                                        width: "100%",
                                        minWidth: 0,
                                        height: 72,
                                        border: 2,
                                        borderColor: selectedIndex === index ? "primary.main" : "divider",
                                        borderRadius: 1,
                                        overflow: "hidden",
                                        backgroundColor: "action.hover",
                                    }}
                                >
                                    {frame.status === "ready" ? (
                                        <Box
                                            component="img"
                                            src={frame.url}
                                            alt=""
                                            onError={() => markDecodeFailure(index)}
                                            loading="lazy"
                                            sx={{width: "100%", height: "100%", objectFit: "cover"}}
                                        />
                                    ) : frame.status === "error" ? (
                                        <BrokenImageRoundedIcon
                                            color="disabled"
                                            data-testid={`retained-media-thumbnail-error-${index}`}
                                        />
                                    ) : frame.status === "loading" ? (
                                        <CircularProgress size={20}/>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">
                                            {index + 1}
                                        </Typography>
                                    )}
                                </ButtonBase>
                            </Box>
                        );
                    })}
                </Box>
            </Stack>
        </Paper>
    );
}

export default function RetainedEventMedia({
    eventId,
    selectedNode,
    videos,
    modeType,
    startTime,
    endTime,
    isPlaying,
    syncTime,
    onVideoTimeUpdate,
    onSelectedVideoIdxChange,
    fetchImpl = fetch,
}: RetainedEventMediaProps) {
    const {t} = useLanguage();
    const [retryGeneration, setRetryGeneration] = useState(0);
    const [lookup, setLookup] = useState<LookupState>(() =>
        eventId?.trim() ? {kind: "loading"} : {kind: "legacy"});
    const normalizedEventId = eventId?.trim() || "";
    const scheduleFrameRequest = useMemo(
        () => createRetainedFrameRequestScheduler(),
        [normalizedEventId],
    );

    useEffect(() => {
        if (!normalizedEventId) {
            setLookup({kind: "legacy"});
            return;
        }
        const controller = new AbortController();
        let timedOut = false;
        const timeout = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, RETAINED_MEDIA_REQUEST_TIMEOUT_MS);
        setLookup({kind: "loading"});
        fetchRetainedEventMedia(normalizedEventId, selectedNode, fetchImpl, controller.signal)
            .then(response => {
                window.clearTimeout(timeout);
                if (controller.signal.aborted) {
                    if (timedOut) setLookup({kind: "error"});
                    return;
                }
                setLookup(response ? {kind: "retained", response} : {kind: "legacy"});
            })
            .catch(error => {
                window.clearTimeout(timeout);
                if (controller.signal.aborted && !timedOut) return;
                if (isAbortError(error) && !timedOut) return;
                console.error("Unable to load retained event media", error);
                setLookup({kind: "error"});
            });
        return () => {
            window.clearTimeout(timeout);
            controller.abort();
        };
    }, [fetchImpl, normalizedEventId, retryGeneration, selectedNode]);

    const legacyProps = useMemo<LegacyVideoProps>(() => ({
        selectedNode,
        videos,
        modeType,
        startTime,
        endTime,
        isPlaying,
        syncTime,
        onVideoTimeUpdate,
        onSelectedVideoIdxChange,
    }), [
        endTime,
        isPlaying,
        modeType,
        onSelectedVideoIdxChange,
        onVideoTimeUpdate,
        selectedNode,
        startTime,
        syncTime,
        videos,
    ]);

    if (lookup.kind === "loading") {
        return (
            <Stack
                minHeight={220}
                alignItems="center"
                justifyContent="center"
                spacing={1}
                role="status"
                aria-live="polite"
                data-testid="retained-media-loading"
            >
                <CircularProgress size={32}/>
                <Typography>{t("retainedMediaLoading")}</Typography>
            </Stack>
        );
    }

    if (lookup.kind === "legacy")
        return <LegacyVideo {...legacyProps}/>;

    if (lookup.kind === "error") {
        return (
            <Stack spacing={1.5}>
                <Alert
                    severity="warning"
                    data-testid="retained-media-api-error"
                    action={(
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => setRetryGeneration(value => value + 1)}
                        >
                            {t("retry")}
                        </Button>
                    )}
                >
                    {t("retainedMediaLoadFailed")}
                </Alert>
                <LegacyVideo {...legacyProps}/>
            </Stack>
        );
    }

    const preservedSourceAvailable = lookup.response.mediaSets.some(
        mediaSet => mediaSet.manifest.source.state === "PRESERVED_FOR_ROLLBACK",
    );
    const selectFrame = (mediaSet: RetainedMediaSetResponse, frame: RetainedMediaAssetResponse) => {
        const eventTime = frameEventTime(mediaSet, frame, startTime, endTime);
        if (eventTime !== null)
            onVideoTimeUpdate?.(eventTime);
    };

    return (
        <Stack spacing={1.5} data-testid="retained-media-gallery">
            <Typography variant="h6">{t("retainedMediaTitle")}</Typography>
            {lookup.response.mediaSets.map(mediaSet => (
                <CameraGallery
                    key={mediaSet.manifest.mediaSetId}
                    eventId={lookup.response.eventId}
                    mediaSet={mediaSet}
                    node={selectedNode}
                    fetchImpl={fetchImpl}
                    scheduleRequest={scheduleFrameRequest}
                    onSelect={frame => selectFrame(mediaSet, frame)}
                />
            ))}
            {preservedSourceAvailable && (videos?.length || 0) > 0 && (
                <Box data-testid="retained-media-source-video">
                    <Typography variant="subtitle1" fontWeight={600} sx={{mb: 1}}>
                        {t("retainedMediaSourceVideo")}
                    </Typography>
                    <LegacyVideo {...legacyProps}/>
                </Box>
            )}
        </Stack>
    );
}
