"use client";

import { Grid, Paper } from "@mui/material";
import CameraGrid from "./CameraGrid";
import LaneStatus from "./LaneStatus";
import AlarmTable from "./AlarmTable";
import EventPreview from "./EventPreview";
import { useState } from "react";
import { SelectedEvent } from "types/new-types";

export default function DashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);  // Reference types/new-types.d.ts to change type
  
  // Handle currently selected event in datagrid
  const handleRowSelect = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    setSelectedEvent(event);
  }

  return (
    <Grid container spacing={2} direction={"column"}>
      <Grid item container spacing={2} style={{ flexBasis: '33.33%', flexGrow: 0, flexShrink: 0 }}>
        <Grid item xs={8}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <CameraGrid />
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <LaneStatus />
          </Paper>
        </Grid>
      </Grid>
      <Grid item container spacing={2} style={{ flexBasis: '66.66%', flexGrow: 0, flexShrink: 0 }}>
        <Grid item xs={8}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <AlarmTable onRowSelect={handleRowSelect} />
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <EventPreview event={selectedEvent} />
          </Paper>
        </Grid>
      </Grid>
    </Grid>
  );
}