"use client";

import { Stack, Typography, capitalize } from '@mui/material';
import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';

export default function LaneStatus() {
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
    {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
  ]

  return (
    <Paper variant='outlined' sx={{ maxHeight: "100%" }}>
      <Stack padding={2} justifyContent={"start"} spacing={1}>
        <Typography variant="h6">Lane Status</Typography>
        <Stack spacing={1} sx={{ overflow: "auto", maxHeight: "100%" }}>
          {demoLanes.map((item) => (
            (item.status !== "none" ? (
              <Paper variant='outlined' sx={{ padding: 1, backgroundColor: (item.status == "alarm" ? "errorHighlight" : "secondaryHighlight") }}>
                <Stack direction={"row"}>
                  <CircleRoundedIcon color={(item.status == "alarm" ? "error" : "secondary")} sx={{ marginRight: 2 }} />
                  <Typography variant="body1">{item.name} - {capitalize(item.status)}</Typography>
                </Stack>
              </Paper>
            ) : (
              <></>
            ))
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}