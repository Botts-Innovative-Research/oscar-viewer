import React, {useMemo, useState} from "react";
import {Box, Stack} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import HLSVideoComponent from "@/app/_components/lane-view/HLSVideoComponent";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import {useHlsStream} from "@/lib/data/oscar/video/useHlsStream";


export default function VideoMedia({ currentLane}: { currentLane: string}) {
    // undefined = first available stream; the arrows pin an explicit stream id.
    const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>(undefined);

    const {videoSource, streams, node, activeStreamId} = useHlsStream(currentLane, selectedStreamId);

    const currentIndex = useMemo(() => {
        if (!activeStreamId) return 0;
        const idx = streams.findIndex((s: any) => s.properties.id === activeStreamId);
        return idx >= 0 ? idx : 0;
    }, [streams, activeStreamId]);

    const handleNextPage = () =>{
        if (currentIndex < streams.length - 1) {
            setSelectedStreamId(streams[currentIndex + 1].properties.id);
        }
    }

    const handlePreviousPage = () =>{
        if (currentIndex > 0) {
            setSelectedStreamId(streams[currentIndex - 1].properties.id);
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
                disabled={currentIndex === 0}
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
                {videoSource && node && (
                    <HLSVideoComponent
                        videoSource={videoSource}
                        selectedNode={node}
                    />
                )}
            </Stack>

            <IconButton
                onClick={handleNextPage}
                sx={{ mx: { xs: 0.5, sm: 2 }, flexShrink: 0, cursor: 'pointer' }}
                disabled={currentIndex >= streams.length - 1}
            >
                <NavigateNextIcon />
            </IconButton>
        </Box>
    );
}
