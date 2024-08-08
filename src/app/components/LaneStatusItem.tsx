"use client";

import { Stack, Typography, capitalize } from '@mui/material';
import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {styled} from "@mui/material/styles";

function updateStatusIconColor(status: string) {
  switch(status){
    case 'Alarm':
      return "error";
    case 'Fault':
      return "info";
    case 'Tamper':
      return "secondary";
  }
}
function updateStatusBackgroundColor(status: string) {
  console.log(status);
  capitalize(status);
  switch(status){
    case 'Alarm':
      return "errorHighlight";
    case 'Fault':
      return "infoHighlight";
    case 'Tamper':
      return "secondaryHighlight";
  }
}
function navigateLaneView(){
  //possibly pass in the lanes data, so it knows what to render??????
  console.log("route to lane view")
  // implement router logic to lane view page
}
export default function LaneStatusItem(props: {
  id: number;
  name: string;
  status: string;
}) {
  if (props.status == "none")
    return (<></>)
  return (
    <Paper key={props.id} variant='outlined' sx={{ cursor: 'pointer', padding: 1,
      backgroundColor: (updateStatusBackgroundColor(props.status))
    }}
           // onClick={{()=> navigateLaneView(parameter)}} //parameter === props.name? so then it would know which lane to open?
    onClick={navigateLaneView}>
      <Stack direction={"row"}>
        <CircleRoundedIcon
            color={updateStatusIconColor(props.status)}
            sx={{ marginRight: 2 }} />
        <Typography variant="body1">{props.name} - {capitalize(props.status)}</Typography>
      </Stack>
    </Paper>
  );
}