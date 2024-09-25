"use client";

import { Grid, Paper, Stack, Typography } from "@mui/material";
import {useState} from "react";
import { IEventTableData, SelectedEvent } from "types/new-types";
import BackButton from "../_components/BackButton";
import { useSearchParams } from 'next/navigation'
import LaneStatus from "./LaneStatus";
import Media from "./Media";
import AlarmTable from "./AlarmTable";

/**
 * Expects the following search params:
 * id: string
 *
 * Need to implement an error page to handle invalid/no search params
 */

interface LaneViewProps {
  laneName: string
}


export default function LaneViewPage() {

  const searchParams = useSearchParams();
  const laneName = searchParams.get("name");
  const id = useSearchParams().get("id")  // Get lane ID from URL query param
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>({startTime: "XX:XX:XX AM", endTime: "XX:XX:XX AM"});  // Reference types/new-types.d.ts to change type


  //TODO pass in props???? from the lane status on dashboard or from the event preview

    return (
    <Stack spacing={2} direction={"column"}>
      <Grid item spacing={2}>
        <BackButton/>
      </Grid>
      <Grid item spacing={2}>
        <Typography variant="h5">Lane View</Typography>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%"}}>
          <LaneStatus laneName={laneName}/>
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <Media event={selectedEvent} laneName={laneName}/>
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <AlarmTable laneName={laneName} />
        </Paper>
      </Grid>
    </Stack>
  );
}
