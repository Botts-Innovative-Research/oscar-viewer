"use client";

import {Box, Grid, Paper} from "@mui/material";
import LaneStatus from "../_components/dashboard/LaneStatus";

import React, {useMemo} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import EventTable from "@/app/_components/event-table/EventTable";
import dynamic from "next/dynamic";
import CircularProgress from "@mui/material/CircularProgress";
import { useBreakpoint } from "../providers";

export default function DashboardPage() {
    const { isTablet, isDesktop } = useBreakpoint();

    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    const QuickView = useMemo(() => dynamic(
        () => import('@/app/_components/dashboard/QuickView'),
        {
            loading: () => <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: '100vh'}}><CircularProgress/></Box>,
            ssr: false
        }
    ), [])

    return (
        <Grid container spacing={2} width={"100%"} height={"auto"}>
            <Grid item container xs={12} lg={8} sx={{ gap: 2, minWidth: 0, height: "100%" }}>
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{ padding: 1 }}>
                        <LaneStatus lanes={{mode: 'all'}} />
                    </Paper>
                </Grid>
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{ padding: 0 }}>
                        <EventTable tableMode={'alarmtable'} laneMap={laneMap} />
                    </Paper>
                </Grid>
            </Grid>
            {/* Conditionally render QuickView if Desktop */}
            {(isDesktop) ? (
                <Grid item xs={12} lg={4}>
                    <Paper variant='outlined' sx={{ padding: 1, height: "100%" }}>
                        <QuickView />
                    </Paper>
                </Grid>
            ): (<></>)}
        </Grid>
    );
}
