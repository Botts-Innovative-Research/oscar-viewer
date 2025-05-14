"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, {useEffect, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';


interface TimeControllerProps {
  startTime: string;
  endTime: string;
  syncTime: any;
  pause: Function;
  play: Function;
  handleCommitChange: (event: Event, newValue: number | number[]) => void;
}

export default function TimeController({syncTime, startTime, endTime, pause, play, handleCommitChange}: TimeControllerProps) {

    const [isPlaying, setIsPlaying] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);


    const [minTime, setMinTime] = useState<number>(new Date(startTime).getTime());
    const [maxTime, setMaxTime] = useState<number>(new Date(endTime).getTime());
    const [currentTime, setCurrentTime]= useState(syncTime);

    useEffect(() => {
        setMinTime(new Date(startTime).getTime());
        setMaxTime(new Date(endTime).getTime());
    }, [startTime, endTime]);


    useEffect(() => {
        if(!isScrubbing)
            setCurrentTime(syncTime);
    }, [syncTime, isScrubbing]);


    const handleSliderChange = (_: Event, newValue: number)=>{
        const value = Array.isArray(newValue) ? newValue[0] : newValue;
        setIsScrubbing(true);
        setCurrentTime(value);
    }

    const handleSliderCommitted = (event: Event, value: number | number[])=>{
        setIsScrubbing(false);
        handleCommitChange(event, value as number);
    }

    const handlePlaying =  ()=> {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
        setIsPlaying(!isPlaying);
    }


    return (
        <Box sx={{padding: 3}}>
            <Stack>
                <Slider
                    aria-labelledby="time-indicator"
                    value={currentTime} //current position of the slider
                    // step={1}
                    min={minTime} //start time of slider
                    max={maxTime} //end time of event
                    onChange={handleSliderChange} //slider as it is dragged
                    onChangeCommitted={handleSliderCommitted} //updates when release the slider
                    valueLabelDisplay="off"
                />
                <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>
                    <IconButton onClick={handlePlaying}>
                        {isPlaying ? (<PauseRoundedIcon />) : (<PlayArrowRoundedIcon />)}
                    </IconButton>
                    <Typography variant="body1">
                        {formatTime(currentTime)} / {formatTime(maxTime)}
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    )
}

// this function will take the timestamp convert it to iso string and then returns it with only the time part
export const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
