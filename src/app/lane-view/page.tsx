"use client";

import { Grid, Paper, Stack, Typography } from "@mui/material";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {IEventTableData, LaneStatusType, SelectedEvent} from "types/new-types";
import BackButton from "../_components/BackButton";
import { useSearchParams } from 'next/navigation'
import LaneStatus from "./LaneStatus";
import Media from "./Media";
import AlarmTable from "./AlarmTable";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {START_TIME} from "@/lib/data/Constants";

/**
 * Expects the following search params:
 * id: string
 *
 * Need to implement an error page to handle invalid/no search params
 */

export default function LaneViewPage() {

  const searchParams = useSearchParams();
  const currentLane = searchParams.get("name");

  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>({startTime: "XX:XX:XX AM", endTime: "XX:XX:XX AM"});  // Reference types/new-types.d.ts to change type
  const [currentTime, setCurrentTime] = useState<Date>();


  function setTimeStamp(){
      const now = new Date();
      setCurrentTime(now);
  }

  useEffect(() => {
    setTimeStamp();
    console.log('current time is', currentTime)
  }, []);

    return (
    <Stack spacing={2} direction={"column"}>
      <Grid item spacing={2}>
        <BackButton/>
      </Grid>
      <Grid item spacing={2}>
        <Typography variant="h4">Lane View</Typography>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%"}}>
          <LaneStatus laneName={currentLane}/>
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <Media event={selectedEvent} laneName={currentLane} currentTime={currentTime}/>
        </Paper>
      </Grid>
      <Grid item container spacing={2} sx={{ width: "100%" }}>
        <Paper variant='outlined' sx={{ width: "100%" }}>
          <AlarmTable laneName={currentLane} />
        </Paper>
      </Grid>
    </Stack>
  );
}
