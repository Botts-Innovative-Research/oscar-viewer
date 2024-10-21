"use client";

import {Grid, Paper} from "@mui/material";
import CameraGrid from "../_components/dashboard/CameraGrid";
import LaneStatus from "../_components/dashboard/LaneStatus";

import {useMemo} from "react";
import Table from "../_components/event-table/Table";
import dynamic from "next/dynamic";


export default function DashboardPage() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    const QuickView = useMemo(() => dynamic(
        () => import('@/app/_components/dashboard/QuickView'),
        {
            loading: () => <p> loading... </p>,
            ssr: false
        }
    ), [])

    return (
        <Grid container spacing={2} direction={"column"}>
            <Grid item container spacing={2} style={{flexBasis: '33.33%', flexGrow: 0, flexShrink: 0}}>
                <Grid item xs={8}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <CameraGrid/>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <LaneStatus/>
                    </Paper>
                </Grid>
            </Grid>
            <Grid item container spacing={2} style={{flexBasis: '66.66%', flexGrow: 0, flexShrink: 0}}>
                <Grid item xs={8}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <Table2 tableMode={'alarmtable'} laneMap={laneMap}/>
                    </Paper>
                </Grid>
                <Grid item xs={4}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <QuickView/>
                    </Paper>
                </Grid>
            </Grid>
        </Grid>
    );
}
