import { Box, Paper, Typography } from "@mui/material";
import EventTable from "../_components/EventTable";

export default function EventLogPage() {
  return (
    <Box>
      <Typography variant="h4">Event Log</Typography>
      <br />
      <Paper variant='outlined' sx={{ height: "100%" }}>
        <EventTable data={[]} viewSecondary viewMenu viewLane />
      </Paper>
    </Box>
  );
}