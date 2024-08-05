"use client";

import { Stack, Typography, capitalize } from '@mui/material';
import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import LaneStatusItem from '../components/LaneStatusItem';
import {Fragment, useEffect, useMemo} from 'react';
import {useDSContext} from "@/app/contexts/DataSourceContext";

export default function LaneStatus() {
  const {dataSources, masterTimeSyncRef} = useDSContext();

  useEffect(() => {
    console.log("LaneStatus dataSources: ", dataSources);
    console.log("LaneStatus masterTimeSyncRef: ", masterTimeSyncRef);
  }, [dataSources, masterTimeSyncRef]);

  // Lanes for demo lane status list
  const demoLanes = [
    {src: "/FrontGateLeft.png", name: "Front Gate Left", status: "alarm", id: 1},
    {src: "/FrontGateRight.png", name: "Front Gate Right", status: "fault", id: 2},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 3},
    {src: "/FerryPOVEntry.png", name: "Ferry POV Entry", status: "none", id: 4},
    {src: "/RearGateLeft.png", name: "Rear Gate Left", status: "none", id: 5},
    {src: "/RearGateRight.png", name: "Rear Gate Right", status: "none", id: 6},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 7},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 8},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 9},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 10},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 11},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 13},
  ]

  return (
    <Stack padding={2} justifyContent={"start"} spacing={1}>
      <Typography variant="h6">Lane Status</Typography>
      <Stack spacing={1} sx={{ overflow: "auto", maxHeight: "100%" }}>
        {demoLanes.map((item) => (
          <LaneStatusItem key={item.id} id={item.id} name={item.name} status={item.status} />
        ))}
      </Stack>
    </Stack>
  );
}
