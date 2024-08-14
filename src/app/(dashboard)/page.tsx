import { Grid, Paper } from "@mui/material";
import CameraGrid from "./CameraGrid";
import LaneStatus from "./LaneStatus";
import AlarmTable from "./AlarmTable";
import EventPreview from "./EventPreview";

export default function DashboardPage() {
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
            <LaneStatus />
          </Paper>
        </Grid>
      </Grid>
      <Grid item container spacing={2} style={{ flexBasis: '66.66%', flexGrow: 0, flexShrink: 0 }}>
        <Grid item xs={8}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <AlarmTable />
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper variant='outlined' sx={{ height: "100%" }}>
            <EventPreview event={1} />
          </Paper>
        </Grid>
      </Grid>
    </Grid>
  );
}