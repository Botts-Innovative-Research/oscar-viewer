"use client";

import { Box, IconButton, SelectChangeEvent, Stack, Typography } from '@mui/material';
import Image from "next/image";
import { useState } from 'react';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AdjudicationSelect from '../components/AdjudicationSelect';

export default function EventPreview(props: {
  event: number
}) {
  const [adjudicated, setAdjudicated] = useState('');

  const handleChange = (event: SelectChangeEvent) => {
    setAdjudicated(event.target.value as string);
  };

  return (
    <Box>
      {props.event !== 0 ? (
        <Stack sx={{ padding: 2 }}>
          <Stack direction={"row"} justifyContent={"space-between"}>
            <Box sx={{ display: "flex" }}>
              <Typography variant="h6">Occupancy ID</Typography>
              <IconButton aria-label="expand" size="small">
                <OpenInFullRoundedIcon fontSize="inherit" />
              </IconButton>
            </Box>
            <IconButton aria-label="close" size="small">
              <CloseRoundedIcon fontSize="inherit" />
            </IconButton>
          </Stack>
          <AdjudicationSelect />
        </Stack>
      ) : (
        <Image src={"/SiteMap.png"} alt="Site Map" width={0} height={0} sizes={"100vw"} style={{ width: "100%", height: "100%", padding: 10 }} />
      )}
    </Box>
  );
}