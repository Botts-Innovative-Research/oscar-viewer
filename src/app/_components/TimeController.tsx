"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, {useEffect, useMemo, useRef, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';
import {API} from "nouislider";
import {IMasterTime} from "@/lib/data/Models";
import {useAppDispatch, useAppSelector} from "@/lib/state/Hooks";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {setInterval} from "next/dist/compiled/@edge-runtime/primitives";
import {FastRewindRounded} from "@mui/icons-material";
import {EventType} from "osh-js/source/core/event/EventType";
import {PlaybackState} from "@/lib/data/Constants";


interface TimeControllerProps {
  timeSync: typeof DataSynchronizer;
  startTime: string;
  endTime: string;
  syncTime: any;
  pause: Function;
  start: Function;
}



export default function TimeController(props: TimeControllerProps) {

  // Vars for handling slider/timestamp values
  const [currentTime, setCurrentTime] = useState<number>(props.syncTime);
  const [minTime, setMinTime] = useState<number>(0);
  const [maxTime, setMaxTime] = useState<number>(0);
  const [ds, setDs] = useState([]);
  const [replay, setReplay] = useState(null);

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

  //
  useEffect(() => {
    setDs(props.timeSync?.getDataSources());
    setReplay(props.timeSync?.getReplaySpeed());
    setMinTime(new Date(props.startTime).getTime());
    setMaxTime(new Date(props.endTime).getTime());

  }, [props.startTime, props.endTime, props.timeSync]);


  useEffect(() => {
    const timeElement = document.getElementById('Slider');
    if (timeElement) {
      if (!isPlaying) {
        timeElement.setAttribute('disabled', 'true');
      } else {
        timeElement.removeAttribute('disabled');
      }
    }
    setCurrentTime(props.syncTime);

  }, [isPlaying]);

  useEffect(() => {
    console.log('syncTime updated:', props.syncTime);
    setCurrentTime(props.syncTime);
  }, [props.syncTime]);


  //when the user toggles the time controller this is the code to change the time sync
  const handleChange = async (event: Event, newValue: number) => {
    // update time sync datasources start time
    for (const dataSource of timesync.getDataSources()) {
      dataSource.setMinTime(newValue);
    }

    // update the time sync start time
    await timesync.setTimeRange(newValue, maxTime, 1.0, true);

    setCurrentTime(newValue);
  };



  // this function will take the timestamp convert it to iso string and then returns it with only the time part
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toISOString().substr(11, 8);
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
            onChange={handleChange}
            valueLabelDisplay="off"
        />

        <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>


          <IconButton
            onClick={() =>{
              if(isPlaying){
                props.pause();
              }else{
                props.start();
              }

                setIsPlaying(!isPlaying)
              }
            }
          >
            {isPlaying ? (
              <PauseRoundedIcon />

            ) : (
              <PlayArrowRoundedIcon />
            )}          
          </IconButton>

          <Typography variant="body1">
            {formatTime(props.syncTime)} / {formatTime(maxTime)}
          </Typography>
        </Stack>
      </Stack>
    </Box> 
  )
}
