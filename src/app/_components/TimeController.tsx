"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, { useEffect, useState, useCallback } from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import CircularProgress from "@mui/material/CircularProgress";

interface TimeControllerProps {
    startTime: string;
    endTime: string;
    syncTime: number | null;
    pause: Function;
    play: Function;
    handleCommitChange: (event: Event, newValue: number | number[]) => void;
    onTimeUpdate?: (currentTime: number) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
}

export default function TimeController({syncTime, startTime, endTime, pause, play, handleCommitChange, onTimeUpdate, onPlayStateChange}: TimeControllerProps) {

    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [minTime, setMinTime] = useState<number | null>(null);
    const [maxTime, setMaxTime] = useState<number | null>(null);
    const [currentTime, setCurrentTime] = useState<number | null>(null);

    useEffect(() => {
        if(startTime && endTime){
            setMinTime(new Date(startTime).getTime());
            setMaxTime(new Date(endTime).getTime());
            setCurrentTime(new Date(startTime).getTime());
        }
    }, [startTime, endTime]);

    useEffect(() => {
        if(!isScrubbing && typeof syncTime === "number") {
            setCurrentTime(syncTime);
            onTimeUpdate?.(syncTime);
        }
    }, [syncTime, isScrubbing, onTimeUpdate]);

    const handleSliderChange = (_: Event, newValue: number | number[]) => {
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setIsScrubbing(true);
        setCurrentTime(value);
        onTimeUpdate(value);
    }

    const handleSliderCommitted = (event: Event, value: number | number[]) => {
        setIsScrubbing(false);
        handleCommitChange(event, value);
        const timeValue = Array.isArray(value) ? value[0] : value;
        onTimeUpdate(timeValue);
    }

    const handlePlaying = () => {
        const newPlayState = !isPlaying;
        if (newPlayState) {
            play();
        } else {
            pause();
        }
        setIsPlaying(newPlayState);
        onPlayStateChange?.(newPlayState);
    }

    return (
        <Box sx={{padding: 3}}>
            <Stack>
                {minTime !== null && maxTime !== null && currentTime !== null && (
                    <div>
                        <Slider
                            aria-labelledby="time-indicator"
                            value={currentTime}
                            min={minTime}
                            max={maxTime}
                            onChange={handleSliderChange}
                            onChangeCommitted={handleSliderCommitted}
                            valueLabelDisplay="off"
                            step={1}
                        />
                        <Stack
                            direction={"row"}
                            alignItems={"center"}
                            justifyContent={"start"}
                        >
                            <IconButton
                                onClick={handlePlaying}
                            >
                                { isPlaying ? (<PauseRoundedIcon />) : (<PlayArrowRoundedIcon />) }
                            </IconButton>
                            <Typography variant="body1">
                                {formatTime(currentTime)} / {formatTime(maxTime)}
                            </Typography>
                        </Stack>
                    </div>
                )}
            </Stack>
        </Box>
    )
}

export const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};