"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, {useEffect, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import CircularProgress from "@mui/material/CircularProgress";


interface TimeControllerProps {
  startTime: string;
  endTime: string;
  syncTime: any;
  pause: Function;
  play: Function;
  handleCommitChange: (event: Event, newValue: number | number[]) => void;
}

export default function TimeController({syncTime, startTime, endTime, pause, play, handleCommitChange}: TimeControllerProps) {

    const [isPlaying, setIsPlaying] = useState(true); //update to false to start paused
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [minTime, setMinTime] = useState<number | null>(null);
    const [maxTime, setMaxTime] = useState<number | null>(null);
    const [currentTime, setCurrentTime]= useState<number | null>(null);

    useEffect(() => {
        if(startTime && endTime){
            setMinTime(new Date(startTime).getTime());
            setMaxTime(new Date(endTime).getTime());
            setCurrentTime(syncTime)
        }

    }, [startTime, endTime]);


    useEffect(() => {
        if(!isScrubbing && typeof syncTime === "number")
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
                {minTime !== null && maxTime !== null && currentTime !== null && (
                    <div>
                        <Slider
                            aria-labelledby="time-indicator"
                            value={currentTime} //current position of the slider
                            // step={1}
                            min={new Date(startTime).getTime()} //start time of slider
                            max={maxTime} //end time of event
                            onChange={handleSliderChange} //slider as it is dragged
                            onChangeCommitted={handleSliderCommitted} //updates when release the slider
                            valueLabelDisplay="off"
                        />
                        <Stack
                            direction={"row"}
                            alignItems={"center"}
                            justifyContent={"start"}
                        >
                            <IconButton
                                onClick={handlePlaying}
                            >
                                {isPlaying ? (<PauseRoundedIcon />) : (<PlayArrowRoundedIcon />)}
                            </IconButton>
                            <Typography
                                variant="body1"
                            >
                                {formatTime(currentTime)} / {formatTime(maxTime)}
                            </Typography>
                        </Stack>
                    </div>

                )}

            </Stack>
        </Box>
    )

}

// this function will take the timestamp convert it to iso string and then returns it with only the time part
export const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
