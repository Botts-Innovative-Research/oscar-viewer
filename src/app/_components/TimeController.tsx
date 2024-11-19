"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import Slider from '@mui/material/Slider';
import { useState } from "react";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FastForwardRoundedIcon from '@mui/icons-material/FastForwardRounded';

export default function TimeController() {

  // Vars for handling slider/timestamp values
  const [currentTime, setCurrentTime] = useState(0);
  const [minTime, setMinTime] = useState(0);
  const [maxTime, setMaxTime] = useState(12);

  // Play/pause toggle state
  const [isPlaying, setIsPlaying] = useState(false);

  // Code to handle slider value change
  const handleChange = () => {};

  // Code to handle fast forward button
  const handleFastForward = () => {};

  return (
    <Box sx={{}}>
      <Stack>
        <Slider
          defaultValue={currentTime}
          min={minTime}
          max={maxTime}
          onChange={handleChange}
          valueLabelDisplay="off"
        />
        <Stack direction={"row"} alignItems={"center"} justifyContent={"start"}>
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
            {currentTime} / {maxTime}
          </Typography>
        </Stack>
      </Stack>
    </Box> 
  )
}
