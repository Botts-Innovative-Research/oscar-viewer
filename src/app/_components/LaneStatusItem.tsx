"use client";

import { Stack, Typography, capitalize } from '@mui/material';
import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';

export default function LaneStatusItem(props: {
  id: number;
  name: string;
  status: string;
}) {
  if (props.status == "none")
    return (<></>)
  return (
    <Paper key={props.id} variant='outlined' sx={{ padding: 1, backgroundColor: (props.status == "alarm" ? "errorHighlight" : "secondaryHighlight") }}>
      <Stack direction={"row"}>
        <CircleRoundedIcon color={(props.status == "alarm" ? "error" : "secondary")} sx={{ marginRight: 2 }} />
        <Typography variant="body1">{props.name} - {capitalize(props.status)}</Typography>
      </Stack>
    </Paper>
  );
}