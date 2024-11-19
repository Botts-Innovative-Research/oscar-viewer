"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import React, {useEffect, useRef, useState} from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';
import {API} from "nouislider";
import {IMasterTime} from "@/lib/data/Models";
import {useAppSelector} from "@/lib/state/Hooks";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {setInterval} from "next/dist/compiled/@edge-runtime/primitives";
import {FastRewindRounded} from "@mui/icons-material";


interface TimeControllerProps {
  startTime: string;
  endTime: string;
}



export default function TimeController(props: TimeControllerProps) {

  // Vars for handling slider/timestamp values
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [minTime, setMinTime] = useState<number>(0);
  const [maxTime, setMaxTime] = useState<number>(0);

  // Play/pause toggle state
  const [isPlaying, setIsPlaying] = useState(false);

  const intervalRef = useRef(0);

  // Convert the event preview start and end time to numbers
  useEffect(() =>{
    const start = new Date(props.startTime).getTime();
    const end = new Date(props.endTime).getTime();

    setMinTime(start);
    setMaxTime(end);
    setCurrentTime(start);

    console.log('start', start, 'end', end)
  }, [props.startTime, props.endTime])

  // auto play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => Math.min(prev + 1000, maxTime));
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, maxTime]);




  // Code to handle slider value change
  const handleChange = (event: Event, newValue: number) => {
    setCurrentTime(newValue);
  };

  // Code to handle fast-forward button, jumps 1.5 seconds til max time is reached
  const handleFastForward = () => {
    setCurrentTime((prevState) => Math.min(prevState + 1500, maxTime))
  };

  // Code to handle fast-rewind button, jumps 1.5 seconds til min time is reached
  const handleFastRewind = () => {
    setCurrentTime((prevState) => Math.max(minTime, prevState - 1500))
  };


  // this function will take the time convert it to iso string and then returns it with only the time
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
            step={1000}
            // onChange={handleChange}
            onChangeCommitted={(event, value) => setCurrentTime(value as number)}
            valueLabelDisplay="off"

        />

        <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>

          <IconButton
              onClick={handleFastRewind}
          >
            <FastRewindRounded />
          </IconButton>



          <IconButton
            onClick={() => setIsPlaying((prevSelected) => !prevSelected)}
          >
            {isPlaying ? (
              <PauseRoundedIcon />

            ) : (
              <PlayArrowRoundedIcon />
            )}          
          </IconButton>
          <IconButton
            onClick={handleFastForward}
          >
            <FastForwardRoundedIcon />   
          </IconButton>


          <Typography variant="body1">
            {formatTime(currentTime)} / {formatTime(maxTime)}
            {/*{new Date(currentTime).toISOString()} / { new Date(maxTime).toISOString()}*/}
          </Typography>
        </Stack>
      </Stack>
    </Box> 
  )
}

// FROM NIC

// updatePlaybackStartTime: (state, action: PayloadAction<string>) => {
//       state.masterTime = new MasterTime({
//         inPlaybackMode: state.masterTime.inPlaybackMode,
//         masterTimePeriod: state.masterTime.masterTimePeriod,
//         playbackTimePeriod: new TimePeriod({
//           id: DEFAULT_TIME_ID,
//           beginPosition: action.payload,
//           endPosition: FUTURE_END_TIME,
//           isIndeterminateEnd: false,
//           isIndeterminateStart: false,
//         }),
//       });
//
//       const updateTimeRange = async function (
//         dataSynchronizer: DataSynchronizer,
//         time: IMasterTime,
//         speed: number
//       ) {
//         console.log('New ST = ' + time.playbackTimePeriod.beginPosition);
//
//         for (const dataSource of dataSynchronizer.getDataSources()) {
//           dataSource.setMinTime(time.playbackTimePeriod.beginPosition);
//         }
//
//         await dataSynchronizer.setTimeRange(
//           time.playbackTimePeriod.beginPosition,
//           time.playbackTimePeriod.endPosition,
//           speed,
//           false
//         );
//
//         console.log('After Set = ' + dataSynchronizer.getStartTimeAsIsoDate());
//       };
//
//       updateTimeRange(
//         state.dataSynchronizer,
//         state.masterTime,
//         state.dataSynchronizerReplaySpeed
//       ).then();
//     },
//
//     updatePlaybackSpeed: (state, action: PayloadAction<number>) => {
//       state.dataSynchronizerReplaySpeed = action.payload;
//
//       const updateSpeed = async function (
//         dataSynchronizer: DataSynchronizer,
//         speed: number
//       ) {
//         await dataSynchronizer.setReplaySpeed(speed);
//       };
//
//       updateSpeed(
//         state.dataSynchronizer,
//         state.dataSynchronizerReplaySpeed
//       ).then();
//     },
//
//     startPlayback: (state) => {
//       state.playbackState = PlaybackState.PLAY;
//
//       const start = async function (dataSynchronizer: DataSynchronizer) {
//         await dataSynchronizer.connect();
//       };
//
//       start(state.dataSynchronizer).then();
//     },
//
//     pausePlayback: (state) => {
//       state.playbackState = PlaybackState.PAUSE;
//
//       const pause = async function (dataSynchronizer: DataSynchronizer) {
//         await dataSynchronizer.disconnect();
//       };
//
//       pause(state.dataSynchronizer).then();
//     },
//   },
