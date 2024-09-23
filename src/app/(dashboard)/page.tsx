"use client";

import { Grid, Paper } from "@mui/material";
import CameraGrid from "./CameraGrid";
import LaneStatus from "./LaneStatus";
import QuickView from "./QuickView";
import {useState} from "react";
import {SelectedEvent} from "types/new-types";
import Table from "../_components/event-table/Table";

export default function DashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);  // Reference types/new-types.d.ts to change type


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
              <LaneStatus/>
            </Paper>
          </Grid>
        </Grid>
        <Grid item container spacing={2} style={{ flexBasis: '66.66%', flexGrow: 0, flexShrink: 0 }}>
          <Grid item xs={8}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <Table tableMode={"alarmtable"} />
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <QuickView />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
  );
}