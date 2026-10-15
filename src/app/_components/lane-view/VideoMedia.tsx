import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {generateHLSVideoCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {Box, Button, CircularProgress, Stack, Typography} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import HLSVideoComponent from "@/app/_components/lane-view/HLSVideoComponent";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {
    getUniqueVideoControlStreams,
    runAbortableWithTimeout,
    stopStreamAfterStartSettles,
} from "@/app/_components/lane-view/VideoStreamUtils";
import {useLanguage} from "@/app/contexts/LanguageContext";

const VIDEO_COMMAND_TIMEOUT_MS = 10_000;


export default function VideoMedia({ currentLane}: { currentLane: string}) {
    const {laneMapRef, readyLaneNames} = useContext(DataSourceContext);
    const {t} = useLanguage();
    const laneReady = Boolean(currentLane && readyLaneNames.has(currentLane));

    const [videoSource, setVideoSource] = useState<string | null>(null);
    const [videoStreams, setVideoStreams] = useState<typeof ControlStream[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [laneEntry, setLaneEntry] = useState<LaneMapEntry | null>(null);
    const [streamStartState, setStreamStartState] = useState<"idle" | "preparing" | "error">("idle");
    const [startGeneration, setStartGeneration] = useState(0);
    const previousStopRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        if (!laneReady || !currentLane) {
            setLaneEntry(null);
            setVideoStreams([]);
            setVideoSource(null);
            setStreamStartState("idle");
            return;
        }

        const resolvedLane = laneMapRef.current.get(currentLane);
        const resolvedStreams = getUniqueVideoControlStreams(resolvedLane);
        setLaneEntry(resolvedLane ?? null);
        setCurrentPage(0);
        setVideoSource(null);
        setVideoStreams(resolvedStreams);
        setStreamStartState(resolvedStreams.length > 0 ? "preparing" : "idle");

        if (resolvedStreams.length === 0)
            console.error(`No video control stream is available for lane ${currentLane}`);
    }, [currentLane, laneMapRef, laneReady]);

    useEffect(() => {
        if (!laneEntry || videoStreams.length === 0)
            return;

        const currentStream = videoStreams[currentPage];

        if (!currentStream)
            return;

        let cancelled = false;
        let startInFlight = false;
        let startLaunched = false;
        let startTask: Promise<void> = Promise.resolve();
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let startAttempts = 0;
        const maxStartAttempts = 30;
        const streamId = currentStream.properties.id;
        const node = laneEntry.parentNode;

        const stopStream = async () => {
            const controller = new AbortController();
            try {
                await runAbortableWithTimeout(
                    controller,
                    VIDEO_COMMAND_TIMEOUT_MS,
                    (signal) => sendCommand(
                        node,
                        streamId,
                        generateHLSVideoCommandJSON(false),
                        {signal},
                    ),
                );
            } catch (error) {
                console.error(`Failed to stop video stream ${streamId}`, error);
            }
        };

        function scheduleStart(delayMs: number) {
            if (cancelled || retryTimer)
                return;
            if (startAttempts >= maxStartAttempts) {
                setStreamStartState("error");
                return;
            }
            retryTimer = setTimeout(() => {
                retryTimer = null;
                void launchStart();
            }, delayMs);
        }

        async function startStream() {
            if (cancelled || startInFlight)
                return;

            startInFlight = true;
            startLaunched = true;
            startAttempts++;
            const controller = new AbortController();
            try {
                const {response, responseJson} = await runAbortableWithTimeout(
                    controller,
                    VIDEO_COMMAND_TIMEOUT_MS,
                    async (signal) => {
                        const response = await sendCommand(
                            node,
                            streamId,
                            generateHLSVideoCommandJSON(true),
                            {signal},
                        );
                        return {
                            response,
                            responseJson: response.ok ? await response.json() : null,
                        };
                    },
                );

                if (!response.ok) {
                    console.error(`Failed to start video stream ${streamId}`);
                    scheduleStart(Math.min(1000 * startAttempts, 5000));
                    return;
                }

                const streamPath = responseJson?.results?.[0]?.data?.streamPath;

                // Cleanup owns the single stop for a cancelled generation and
                // waits for this task before sending it.
                if (cancelled)
                    return;

                if (streamPath) {
                    startAttempts = 0;
                    setVideoSource(streamPath);
                } else {
                    scheduleStart(Math.min(1000 * startAttempts, 5000));
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(`Failed to start video stream ${streamId}`, error);
                    scheduleStart(Math.min(1000 * startAttempts, 5000));
                }
            } finally {
                startInFlight = false;
            }
        }

        function launchStart(): Promise<void> {
            if (cancelled || startInFlight)
                return startTask;
            startTask = startStream();
            return startTask;
        }

        const previousStop = previousStopRef.current;
        setVideoSource(null);
        setStreamStartState("preparing");
        startTask = previousStop.then(() => {
            if (!cancelled)
                return launchStart();
        });

        return () => {
            cancelled = true;
            if (retryTimer)
                clearTimeout(retryTimer);
            // Do not abort a dispatched start here: the client promise could settle
            // before an already-accepted server command does. Its own deadline keeps
            // this wait bounded, then the stop is likewise bounded before replacement.
            const taskAtCleanup = startTask;
            previousStopRef.current = stopStreamAfterStartSettles(
                taskAtCleanup,
                () => startLaunched,
                stopStream,
            );
        };
    }, [currentPage, laneEntry, videoStreams, startGeneration]);

    const retryStreamStart = useCallback(() => {
        setVideoSource(null);
        setStreamStartState("preparing");
        setStartGeneration((generation) => generation + 1);
    }, []);

    const handleNextPage = () =>{
        if (currentPage < videoStreams.length - 1) {
            setCurrentPage(prev => prev + 1);
        }
    }

    const handlePreviousPage = () =>{
        if (currentPage > 0) {
            setCurrentPage(prev => prev - 1)
        }
    }

    return (
        <Box sx={{
            display: "flex",
            flexWrap: "nowrap",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            overflow: "hidden",
        }}>
            <IconButton
                onClick={handlePreviousPage}
                sx={{ mx: { xs: 0.5, sm: 2 }, flexShrink: 0, cursor: 'pointer' }}
                disabled={currentPage === 0}
            >
                <NavigateBeforeIcon />
            </IconButton>

            <Stack
                spacing={2}
                direction="row"
                alignContent="center"
                justifyContent="center"
                sx={{
                    alignItems: "center",
                    border: "1px solid rgba(0,0,0,0.12)",
                    padding: 1,
                    minWidth: 0,
                    flex: 1,
                    overflow: "hidden",
                }}
            >
                {!videoSource && streamStartState === "preparing" && (
                    <Stack
                        data-testid="live-video-command-preparing"
                        role="status"
                        alignItems="center"
                        spacing={1.5}
                        sx={{minHeight: "500px", justifyContent: "center"}}
                    >
                        <CircularProgress size={28}/>
                        <Typography align="center">{t("liveVideoPreparing")}</Typography>
                    </Stack>
                )}
                {!videoSource && streamStartState === "error" && (
                    <Stack
                        data-testid="live-video-command-error"
                        role="alert"
                        alignItems="center"
                        spacing={2}
                        sx={{minHeight: "500px", justifyContent: "center"}}
                    >
                        <Typography align="center">{t("liveVideoPlaybackError")}</Typography>
                        <Button variant="contained" onClick={retryStreamStart}>
                            {t("retry")}
                        </Button>
                    </Stack>
                )}
                {!videoSource && videoStreams.length === 0 && laneEntry && (
                    <Typography>{t("noVideoAvailable")}</Typography>
                )}
                {videoSource && laneEntry?.parentNode && (
                    <HLSVideoComponent
                        videoSource={videoSource}
                        selectedNode={laneEntry.parentNode}
                        onRetry={retryStreamStart}
                    />
                )}
            </Stack>

            <IconButton
                onClick={handleNextPage}
                sx={{ mx: { xs: 0.5, sm: 2 }, flexShrink: 0, cursor: 'pointer' }}
                disabled={currentPage === videoStreams.length - 1}
            >
                <NavigateNextIcon />
            </IconButton>
        </Box>
    );
}
