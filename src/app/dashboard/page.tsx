"use client";

import {Grid, Paper} from "@mui/material";
import LaneStatus from "../_components/dashboard/LaneStatus";

import {useMemo} from "react";
import dynamic from "next/dynamic";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import Table2 from "@/app/_components/event-table/TableType2";

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
                <Grid item xs={8} sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
                    <Paper variant='outlined' sx={{height: "auto", minHeight: 200, padding: 1}}>
                        <LaneStatus/>
                    </Paper>

                    <Paper variant='outlined' sx={{flexGrow: 1, padding: 2, overflow: "hidden"}}>
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
