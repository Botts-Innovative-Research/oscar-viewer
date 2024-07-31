import { Grid } from "@mui/material";
import CameraGrid from "./components/CameraGrid";
import LaneStatus from "./components/LaneStatus";
import AlarmTable from "./components/AlarmTable";
import EventPreview from "./components/EventPreview";

export default function Page() {
  return (
    <Grid container spacing={2} direction={"column"}>
      <Grid item container spacing={2} style={{ flexBasis: '33.33%', flexGrow: 0, flexShrink: 0 }}>
        <Grid item xs={8}>
          <CameraGrid />
        </Grid>
        <Grid item xs={4}>
          <LaneStatus />
        </Grid>
      </Grid>
      <Grid item container spacing={2} style={{ flexBasis: '66.66%', flexGrow: 0, flexShrink: 0 }}>
        <Grid item xs={8}>
          <AlarmTable />
        </Grid>
        <Grid item xs={4}>
          <EventPreview event={1} />
        </Grid>
      </Grid>
    </Grid>
  );
}