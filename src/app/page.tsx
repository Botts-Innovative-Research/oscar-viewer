import { Box, Button, Container, Grid } from "@mui/material";
import CameraGrid from "./components/CameraGrid";

export default function Page() {
  return (
    <Grid container spacing={2}>
      <Grid container>
        <Grid item xs={8}>
          <CameraGrid />
        </Grid>
        <Grid item xs={4}></Grid>
      </Grid>
    </Grid>
  );
}