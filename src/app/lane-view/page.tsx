"use client";

import {Grid, Paper, Stack, Typography} from "@mui/material";
import BackButton from "../_components/BackButton";
import {useSearchParams} from 'next/navigation'
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import Table2 from "@/app/_components/event-table/TableType2";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import {RootState} from "@/lib/state/Store";
import React, {useEffect, useState} from "react";


export default function LaneViewPage() {

    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const searchParams = useSearchParams();
    const currentLane = searchParams.get("name");
    const [filteredLaneMap, setFilteredLaneMap] = useState<Map<string, LaneMapEntry>>(null);

    console.log("Lane name:", currentLane)
    let newMap = new Map<string, LaneMapEntry>();
    newMap.set(currentLane, laneMap.get(currentLane));



    return (
        <Stack spacing={2} direction={"column"}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={"auto"} >
                    <BackButton/>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">Lane View</Typography>
                </Grid>
            </Grid>

          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%"}}>
              <LaneStatus laneName={currentLane}/>
            </Paper>
          </Grid>
          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" }}>
              <Media laneName={currentLane}/>
            </Paper>
          </Grid>
          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" }}>
                <Table2 tableMode={'eventlog'} laneMap={newMap} viewLane viewSecondary viewAdjudicated viewMenu/>
            </Paper>
          </Grid>
        </Stack>
  );
}
