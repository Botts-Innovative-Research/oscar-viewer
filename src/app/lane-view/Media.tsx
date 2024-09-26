"use client";

import {Grid, Typography } from "@mui/material";
import { SelectedEvent } from "types/new-types";
import VideoGrid from "./VideoGrid";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";


export default function Media(props: {
  event: SelectedEvent;
  laneName: string
}) {



  return (
      //chart gamma
      //chart neutron


      <Grid container direction="row" spacing={2}>
        <Grid item xs>
          <>
          </>
        </Grid>
        <Grid item xs>
        <>
        </>
        </Grid>
        <Grid item xs>
          <VideoGrid laneName={props.laneName}/>
        </Grid>
      </Grid>


  );
}
