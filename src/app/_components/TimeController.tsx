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
  handleChange: (event: Event, newValue: number, isPlaying: boolean) => void;
}



export default function TimeController({timeSync, syncTime, startTime, endTime, pause, play, handleChange}: TimeControllerProps) {

  // Vars for handling slider/timestamp values
  const [currentTime, setCurrentTime] = useState(syncTime);
  const [minTime, setMinTime] = useState<number>(0);
  const [maxTime, setMaxTime] = useState<number>(0);
  const [ds, setDs] = useState([]);
  const [replay, setReplay] = useState(null);

  // const isDragging = useRef(false);

  // Play/pause toggle state
  const [isPlaying, setIsPlaying] = useState(true);

  // creates a data synchronizer based off of use states
  const timesync = useMemo(() => {
    return new DataSynchronizer({
      dataSources: ds,
      replaySpeed: replay,
      startTime: minTime,
      endTime: maxTime,
    });
  }, [ds, replay, minTime, maxTime])


  useEffect(() => {
    setDs(timeSync?.getDataSources());
    setReplay(timeSync?.getReplaySpeed());
    setMinTime(new Date(startTime).getTime());
    setMaxTime(new Date(endTime).getTime());

  }, [startTime, endTime, timeSync]);

  useEffect(() => {
    setCurrentTime(syncTime);
  }, [syncTime]);


  // this function will take the timestamp convert it to iso string and then returns it with only the time part
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };


  const handleSliderChange= (_event: Event, newValue: number)=>{
    setCurrentTime(newValue);
  }

  const handleSliderChangeCommitted = async (event: Event, newValue: number) => {
    // await pause();

    handleChange(event, newValue, isPlaying);

  };

  return (
      <Box sx={{
        padding: 3
      }}>
        <Stack>
          <Slider
              aria-label="time-indicator"
              value={currentTime} //current position of the slider
              min={minTime} //start time of slider
              max={maxTime} //end time of event
              onChange={handleSliderChange}
              onChangeCommitted={handleSliderChangeCommitted}
              valueLabelDisplay="off"
          />

          <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>


            <IconButton
                onClick={async() =>{
                  // isPlaying ? await pause() : await start();
                  // setIsPlaying(!isPlaying)

                    if (isPlaying) {
                      await pause();
                      setIsPlaying(false);
                    } else {
                      await play();
                      setIsPlaying(true);
                    }


                }
            }
            >
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
