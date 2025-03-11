"use client";

import {Box, Grid } from "@mui/material";
import VideoGrid from "./VideoGrid";
import {useState} from "react";
import ChartLane from "@/app/_components/lane-view/ChartLane";

export default function Media(props: { laneName: string, gammaDs: any, neutronDs: any, thresholdDs: any, videoDs: any}) {

    const [chartReady, setChartReady] = useState<boolean>(false);

    return (
        <Box sx={{flexGrow: 1, overflowX: "auto"}}>
            <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                <Grid item xs={12} md={6}>
                    <ChartLane  laneName={props.laneName} setChartReady={() => chartReady}  datasources={{
                        gamma: props.gammaDs,
                        neutron: props.neutronDs,
                        threshold: props.thresholdDs
                    }}/>
                </Grid>
                <Grid item xs={12} md={6}>
                    <VideoGrid laneName={props.laneName}/>
                </Grid>
          </Grid>
        </Box>
  );
}
