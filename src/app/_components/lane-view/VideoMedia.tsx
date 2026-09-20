import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {generateHLSVideoCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {Box, Stack} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import HLSVideoComponent from "@/app/_components/lane-view/HLSVideoComponent";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {getUniqueVideoControlStreams} from "@/app/_components/lane-view/VideoStreamUtils";


export default function VideoMedia({ currentLane}: { currentLane: string}) {
    const {laneMapRef, laneMapReady} = useContext(DataSourceContext);

    const [videoSource, setVideoSource] = useState(null);
    const [videoStreams, setVideoStreams] = useState<typeof ControlStream[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [laneEntry, setLaneEntry] = useState<LaneMapEntry | null>(null);
    const restartStreamRef = useRef<(() => void) | null>(null);

    const handleManifestNotFound = useCallback(() => {
        restartStreamRef.current?.();
    }, []);

    useEffect(() => {
        if (!laneMapReady || !currentLane) {
            setLaneEntry(null);
            setVideoStreams([]);
            setVideoSource(null);
            return;
        }

        const resolvedLane = laneMapRef.current.get(currentLane);
        const resolvedStreams = getUniqueVideoControlStreams(resolvedLane);
        setLaneEntry(resolvedLane ?? null);
        setCurrentPage(0);
        setVideoSource(null);
        setVideoStreams(resolvedStreams);

        if (resolvedStreams.length === 0)
            console.error(`No video control stream is available for lane ${currentLane}`);
    }, [currentLane, laneMapReady, laneMapRef]);

    useEffect(() => {
        if (!laneMapReady || !laneEntry || videoStreams.length === 0)
            return;

        const currentStream = videoStreams[currentPage];

        if (!currentStream)
            return;

        let cancelled = false;
        let startInFlight = false;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let startAttempts = 0;
        const maxStartAttempts = 30;
        const streamId = currentStream.properties.id;
        const node = laneEntry.parentNode;

        const stopStream = async () => {
            try {
                await sendCommand(node, streamId, generateHLSVideoCommandJSON(false));
            } catch (error) {
                console.error(`Failed to stop video stream ${streamId}`, error);
            }
        };

        const scheduleStart = (delayMs: number) => {
            if (cancelled || retryTimer || startAttempts >= maxStartAttempts)
                return;
            retryTimer = setTimeout(() => {
                retryTimer = null;
                void startStream();
            }, delayMs);
        };

        const startStream = async () => {
            if (cancelled || startInFlight)
                return;

            startInFlight = true;
            startAttempts++;
            try {
                const response = await sendCommand(
                    node,
                    streamId,
                    generateHLSVideoCommandJSON(true),
                );

                if (!response.ok) {
                    console.error(`Failed to start video stream ${streamId}`);
                    scheduleStart(Math.min(1000 * startAttempts, 5000));
                    return;
                }

                const responseJson = await response.json();
                const streamPath = responseJson?.results?.[0]?.data?.streamPath;

                // A lane/page change may finish while the command is in flight.
                // Stop the now-stale server stream instead of attaching it.
                if (cancelled) {
                    await stopStream();
                    return;
                }

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
        };

        const restartStream = () => scheduleStart(0);
        restartStreamRef.current = restartStream;

        setVideoSource(null);
        void startStream();

        return () => {
            cancelled = true;
            if (retryTimer)
                clearTimeout(retryTimer);
            if (restartStreamRef.current === restartStream)
                restartStreamRef.current = null;
            void stopStream();
        };
    }, [currentPage, laneEntry, laneMapReady, videoStreams]);

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
                {videoSource && laneEntry?.parentNode && (
                    <HLSVideoComponent
                        videoSource={videoSource}
                        selectedNode={laneEntry.parentNode}
                        onManifestNotFound={handleManifestNotFound}
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
