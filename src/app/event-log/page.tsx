"use client"
import { Box, Paper, Typography } from "@mui/material";
import Table from "../_components/event-table/Table";
import {useSelector} from "react-redux";
import {selectEventTableDataArray} from "@/lib/state/EventDataSlice";
import EventTable from "../_components/event-table/EventTable";
import {EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";

export default function EventLogPage() {


    const eventLog = useSelector(selectEventTableDataArray);

    let eventLogData = new EventTableDataCollection();
    eventLogData.data = eventLog

    return (
        <Box>
            <Typography variant="h4">Event Log</Typography>
            <br />
            <Paper variant='outlined' sx={{ height: "100%" }}>
                <Table tableMode={"eventlog"} />
                {/*<EventTable eventTable={eventLogData} viewMenu viewLane viewSecondary viewAdjudicated/>*/}
            </Paper>
        </Box>
    );
}