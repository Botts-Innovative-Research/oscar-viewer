"use client";

import {Box, Grid, Paper} from "@mui/material";
import LaneStatus, { LaneStatusProps } from "../_components/dashboard/LaneStatus";

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap, setLaneMap} from "@/lib/state/OSCARLaneSlice";
import EventTable from "@/app/_components/event-table/EventTable";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {
    isConnectionDataStream,
    isGammaDataStream,
    isNeutronDataStream,
    isTamperDataStream,
    isThresholdDataStream,
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useAppDispatch} from "@/lib/state/Hooks";
import dynamic from "next/dynamic";
import CircularProgress from "@mui/material/CircularProgress";
import { useBreakpoint } from "../providers";

export default function DashboardPage() {
    const { isTablet, isDesktop } = useBreakpoint();

    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const dispatch = useAppDispatch();
    const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);
    const idVal = useRef(1);

    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        let newStatusList: LaneStatusProps[] = [];

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            laneDSMap.set(laneid, new LaneDSColl());

            lane.datastreams.forEach((ds, idx) => {

                let rtDS = lane.datasourcesRealtime?.[idx];

                if (!rtDS) {
                    console.warn(`Missing RT data for datastream in lane ${laneid} at index ${idx}`);
                    return;
                }

                rtDS.properties.startTime = new Date().toISOString();
                rtDS.properties.endTime = "2055-01-01T08:13:25.845Z";

                let laneDSColl = laneDSMap.get(laneid);

                if(isGammaDataStream(ds))
                    laneDSColl.addDS('gammaRT', rtDS);

                if(isNeutronDataStream(ds))
                    laneDSColl.addDS('neutronRT', rtDS);

                if(isTamperDataStream(ds))
                    laneDSColl.addDS('tamperRT', rtDS);

                if(isConnectionDataStream(ds))
                    laneDSColl.addDS('connectionRT', rtDS);

                if(isThresholdDataStream(ds))
                    laneDSColl.addDS('gammaTrshldRT', rtDS);
            });

            newStatusList.push({
                id: idVal.current++,
                name: laneid,
                isOnline: false,
                isTamper: false,
                isFault: false,
            });


            const newMap = new Map(laneDSMap)

            setDataSourcesByLane(newMap);
            dispatch(setLaneMap(laneMap))
        }
        setStatusList(prevState => [...newStatusList,
            ...prevState.filter(item => !newStatusList.some(newItem => newItem.name === item.name))]);

    }, [laneMapRef, laneMapRef.current.size]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef, laneMapRef.current.size]);

    const QuickView = useMemo(() => dynamic(
        () => import('@/app/_components/dashboard/QuickView'),
        {
            loading: () => <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', minHeight: '100vh'}}><CircularProgress/></Box>,
            ssr: false
        }
    ), [])

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12} lg={8} sx={{display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0}}>
                <Paper variant='outlined' sx={{height: "auto", minHeight: 275, padding: 1}}>
                    <LaneStatus dataSourcesByLane={dataSourcesByLane} initialLanes={statusList} />
                </Paper>
                <Paper variant='outlined' sx={{flexGrow: 1, padding: 2, overflow: "hidden"}}>
                    <EventTable tableMode={'alarmtable'} laneMap={laneMap} />
                </Paper>
            </Grid>
            {/* Conditionally render QuickView if Desktop */}
            {(isDesktop) ? (
                <Grid item xs={12} lg={4}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <QuickView />
                    </Paper>
                </Grid>
            ): (<></>)}
        </Grid>
    );
}