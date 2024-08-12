"use client";


import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {capitalize, Stack, Typography} from '@mui/material';

export default function LaneStatusItem(props: {
  id: number;
  name: string;
  status: string;
}) {
  if (props.status == "none")
    return (<></>)
  return (
    <Paper key={props.id} variant='outlined' sx={{ cursor: 'pointer', padding: 1,
      backgroundColor: (
          props.status == "Alarm"
              ? "errorHighlight"
              : props.status == 'Tamper'
              ? "secondaryHighlight"
              : props.status.includes('Fault')
              ? 'infoHighlight'
              : 'unknown'
      )
    }}
    >
      <Stack direction={"row"}>
        <CircleRoundedIcon
            color={(
                props.status === "Alarm"
              ? "error"
              : props.status === 'Tamper'
              ? "secondary"
              : props.status.includes('Fault')
              ? 'info'
              :'info'
            )
        }
            sx={{ marginRight: 2 }} />
        <Typography variant="body1">{props.name} - {capitalize(props.status)}</Typography>
      </Stack>
    </Paper>
  );
}