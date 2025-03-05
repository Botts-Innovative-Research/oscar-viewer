"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, { useEffect, useMemo, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";



interface TimeControllerProps {
  timeSync: typeof DataSynchronizer;
  startTime: string;
  endTime: string;
  syncTime: any;
  pause: Function;
  start: Function;
  handleChange: Function;
}



export default function TimeController(props: TimeControllerProps) {

  // Vars for handling slider/timestamp values
  const [currentTime, setCurrentTime] = useState(props.syncTime);
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
    // console.log('syncTime updated:', props.syncTime);
    setCurrentTime(props.syncTime);
  }, [props.syncTime]);




  // this function will take the timestamp convert it to iso string and then returns it with only the time part
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };


  // function to change replay speed the time controller
  // const updateReplaySpeed = async () => {
  //   let speed = 2.0;
  //   if (props.timeSync && props.timeSync.isConnected()) {
  //     await props.timeSync.setReplaySpeed(speed);
  //     console.log("Replay speed updated.");
  //   }
  // };




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
            onChangeCommitted={props.handleChange}
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
            {formatTime(currentTime)} / {formatTime(maxTime)}
          </Typography>
        </Stack>
      </Stack>
    </Box> 
  )
}

