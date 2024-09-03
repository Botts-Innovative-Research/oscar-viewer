"use client"
import { Box, Paper, Typography } from "@mui/material";
import Table from "@/app/_components/Table";

export default function EventLogPage() {
    return (
        <Box>
            <Typography variant="h4">Event Log</Typography>
            <br />
            <Paper variant='outlined' sx={{ height: "100%" }}>
                <Table isEventLog onRowSelect= {() =>{}} />
            </Paper>
        </Box>
    );
}