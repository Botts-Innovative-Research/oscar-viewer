"use client"
import { Box, Paper, Typography } from "@mui/material";
import Table from "../_components/event-table/Table";

export default function EventLogPage() {
    return (
        <Box>
            <Typography variant="h4">Event Log</Typography>
            <br />
            <Paper variant='outlined' sx={{ height: "100%" }}>
                <Table tableMode={"eventlog"} onRowSelect= {() =>{}} />
            </Paper>
        </Box>
    );
}