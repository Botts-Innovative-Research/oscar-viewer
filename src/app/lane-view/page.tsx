"use client";

import { Grid, Paper, Stack, Typography } from "@mui/material";
import BackButton from "../_components/BackButton";
import { useSearchParams } from 'next/navigation'
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import Table from "@/app/_components/event-table/Table";


export default function LaneViewPage() {

    const searchParams = useSearchParams();
    const currentLane = searchParams.get("name");

    return (
        <Stack spacing={2} direction={"column"}>
          <Grid item spacing={2}>
            <BackButton/>
          </Grid>
          <Grid item spacing={2}>
            <Typography variant="h4">Lane View</Typography>
          </Grid>
          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%"}}>
              <LaneStatus laneName={currentLane}/>
            </Paper>
          </Grid>
          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" }}>
              <Media laneName={currentLane} />
            </Paper>
          </Grid>
          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" }}>
                <Table tableMode={"laneview"} laneName={currentLane}/>
            </Paper>
          </Grid>
        </Stack>
  );
}
