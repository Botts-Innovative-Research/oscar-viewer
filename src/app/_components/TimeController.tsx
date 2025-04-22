"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, {useEffect, useMemo, useRef, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";



interface TimeControllerProps {
  timeSync: typeof DataSynchronizer;
  startTime: string;
  endTime: string;
  syncTime: any;
  pause: Function;
  play: Function;
  handleCommitChange: (event: Event, newValue: number, isPlaying: boolean) => void;
  // debouncedSetTime: (newValue: number) => void;
}



export default function TimeController({timeSync, syncTime, startTime, endTime, pause, play, handleCommitChange}: TimeControllerProps) {


    const [currentTime, setCurrentTime] = useState(syncTime);
    const [minTime, setMinTime] = useState<number>(new Date(startTime).getTime());
    const [maxTime, setMaxTime] = useState<number>(new Date(endTime).getTime());

    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);


    useEffect(() => {
        setMinTime(new Date(startTime).getTime());
        setMaxTime(new Date(endTime).getTime());
    }, [startTime, endTime]);

    useEffect(() => {
        if(!isScrubbing)
            setCurrentTime(syncTime);
    }, [syncTime, isScrubbing]);


      // this function will take the timestamp convert it to iso string and then returns it with only the time part
    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };


    const scrubTimeoutRef = useRef(null);

    const handleSliderChange = (event: Event, value: number | number[])=>{
        const newTime = value as number;
        setIsScrubbing(true);
        setCurrentTime(newTime);


        if (scrubTimeoutRef.current) {
            clearTimeout(scrubTimeoutRef.current);
        }

        scrubTimeoutRef.current = setTimeout(() =>{
            handleCommitChange(event, newTime, isPlaying);
            // timeSync.setTimeRange(value, maxTime, isPlaying, true);
        }, 100)

    }

    const handleSliderCommitted = async(event: Event, value: number | number[])=>{
        setIsScrubbing(false);

        if (scrubTimeoutRef.current) {
            clearTimeout(scrubTimeoutRef.current);
            scrubTimeoutRef.current = null;
        }

        handleCommitChange(event, value as number, isPlaying);
    }

    const handlePlaying = async ()=> {
        if (isPlaying) {
            await pause();
        } else {
            await play();
        }
        setIsPlaying(!isPlaying);
    }
    return (
        <Box sx={{
        padding: 3
        }}>
        <Stack>
          <Slider
              aria-labelledby="continuous-slider"
              value={currentTime} //current position of the slider
              // step={1}
              min={minTime} //start time of slider
              max={maxTime} //end time of event
              onChange={handleSliderChange} //slider as it is dragged
              onChangeCommitted={handleSliderCommitted} //updates when drops the slider
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