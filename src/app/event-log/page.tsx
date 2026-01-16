"use client"
import { Box, Grid, Paper, Typography } from "@mui/material";
import EventTable from "@/app/_components/event-table/EventTable";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";

export default function EventLogPage() {


    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12}>
                <Typography variant="h4">Event Log</Typography>
            </Grid>
            
            <Grid item xs={12} sx={{ gap: 2, minWidth: 0 }}>
                <Paper variant='outlined' sx={{ flexGrow: 1, padding: 2, overflow: "hidden" }}>
                    <EventTable tableMode={"eventlog"} viewLane viewAdjudicated laneMap={laneMap}/>
                </Paper>
            </Grid>
        </Grid>
    );
}