import {Box, Grid, Paper} from "@mui/material";
import React from "react";
import N42Chart from "@/app/_components/n42/N42Chart";
import NuclideAnalysisTable from "@/app/_components/n42/NuclideAnalysisTable";


// this will be under adjudications when they upload a file
export default function N42Detail() {

    // linear spectrum datasource
    // nuclide analysis datasource
    // compressed spectrum datasource

    return(
        <Paper>
            <Box display='flex' alignItems="center">
                <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                    <Grid item xs>
                        {/*linear*/}
                        {/*<N42Chart laneName={""} datasource={undefined} setChartReady={undefined} title={""} yCurve={""} yValue={""}/>*/}
                    </Grid>
                    <Grid item xs>
                        {/*compressed*/}
                        {/*<N42Chart laneName={""} datasource={undefined} setChartReady={undefined} title={""} yCurve={""} yValue={""}/>*/}
                    </Grid>
                </Grid>
                <NuclideAnalysisTable datasource={undefined}/>
            </Box>
        </Paper>
    )
}