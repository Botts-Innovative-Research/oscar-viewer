"use client";

import {Box, Paper, Typography} from "@mui/material";

import MapComponent from "../_components/Map/MapComponent";

//could make height 600px
export default function MapViewPage() {
  return (
      <Box>
          <Typography variant="h4" sx={{padding: 2 }}>Map</Typography>
          <br />
          <Paper variant='outlined' sx={{height: "800px", width: "100%"}}>
              <MapComponent/>
          </Paper>
      </Box>
    );
}


