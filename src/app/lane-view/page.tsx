"use client";

import { Grid, Paper, Stack, Typography } from "@mui/material";
import { useState, Suspense } from "react";
import { EventTableData, SelectedEvent } from "types/new-types";
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

const testData: EventTableData = {
    //@ts-ignore
  id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma',
}

export default function LaneViewPage() {
  const id = useSearchParams().get("id")  // Get lane ID from URL query param
  console.log(id);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>({startTime: "XX:XX:XX AM", endTime: "XX:XX:XX AM"});  // Reference types/new-types.d.ts to change type

  return (
      <Suspense>
    <Stack spacing={2} direction={"column"}>
      <Grid item spacing={2}>
        <BackButton />
      </Grid>
      <Grid item spacing={2}>
        <Typography variant="h5">Lane View</Typography>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <LaneStatus />
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <Media event={selectedEvent} />
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <AlarmTable />
        </Paper>
      </Grid>
    </Stack>
      </Suspense>
  );
}