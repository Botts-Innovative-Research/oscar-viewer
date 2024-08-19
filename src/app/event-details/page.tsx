"use client";

import { Grid, Paper, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { SelectedEvent } from "types/new-types";
import BackButton from "../_components/BackButton";
import DataRow from "./DataRow";
import Media from "./Media";
import MiscTable from "./MiscTable";
import AddComment from "./AddComment";


/**
 * Expects the following search params:
 * startTime: string;
 * endTime: string;
 * 
 * Need to implement an error page to handle invalid/no search params
 */

const testData = {
  id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma',
}

export default function EventDetailsPage() {
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>({startTime: "XX:XX:XX AM", endTime: "XX:XX:XX AM"});  // Reference types/new-types.d.ts to change type

  // Handle currently selected event in datagrid
  const handleRowSelect = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    setSelectedEvent(event);
  }

  return (
    <Stack spacing={2} direction={"column"}>
      <Grid item spacing={2}>
        <BackButton />
      </Grid>
      <Grid item spacing={2}>
        <Typography variant="h5">Event Details</Typography>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <DataRow event={selectedEvent} />
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <Media event={selectedEvent} />
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <MiscTable event={selectedEvent} />
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <AddComment event={selectedEvent} />
        </Paper>
      </Grid>
    </Stack>
  );
}