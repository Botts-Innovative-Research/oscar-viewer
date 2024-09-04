"use client";

import {Box, Paper, Typography} from "@mui/material";
import Map from "@/app/_components/Map";

export default function MapViewPage() {

  return (
      <Box>
          <Typography variant="h4">Map</Typography>
          <br />
          <Paper variant='outlined' sx={{height: "100%"}}>
              <Map onPointMarkerSelect = {()=>{}} />
          </Paper>
      </Box>
  );
}