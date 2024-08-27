"use client"
import { Box, Paper, Typography } from "@mui/material";
import EventTable from "../_components/EventTable";
import {EventTableData, SelectedEvent} from "../../../types/new-types";
import Table from "@/app/_components/Table";

interface EventLogProps {
    data: EventTableData[];
    // laneOccupancyData?: LaneOccupancyData[];
}


export default function EventLogPage(props: EventLogProps) {
    return (
    <Box>
      <Typography variant="h4">Event Log</Typography>
      <br />
      <Paper variant='outlined' sx={{ height: "100%" }}>
          <Table isEventLog  onRowSelect= {() =>{}} />
        {/*<EventTable data={props.data} viewSecondary viewMenu viewLane/>*/}
      </Paper>
    </Box>
  );
}