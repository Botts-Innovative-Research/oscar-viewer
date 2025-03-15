"use client";

import {Grid, Paper} from "@mui/material";
import LaneStatus from "../_components/dashboard/LaneStatus";

import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import dynamic from "next/dynamic";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import Table2 from "@/app/_components/event-table/TableType2";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {
    isConnectionDatastream,
    isGammaDatastream,
    isNeutronDatastream,
    isTamperDatastream,
    isThresholdDatastream, isVideoDatastream
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

export default function DashboardPage() {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());


    const QuickView = useMemo(() => dynamic(
        () => import('@/app/_components/dashboard/QuickView'),
        {
            loading: () => <p> loading... </p>,
            ssr: false
        }
    ), [])


    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];

                rtDS.properties.startTime = new Date().toISOString();
                rtDS.properties.endTime = "2055-01-01T08:13:25.845Z"

                let laneDSColl = laneDSMap.get(laneid);

                if(isGammaDatastream(ds)){
                    laneDSColl.addDS('gammaRT', rtDS);
                }
                if(isNeutronDatastream(ds)){
                    laneDSColl.addDS('neutronRT', rtDS);
                }
                if(isTamperDatastream(ds)){
                    laneDSColl.addDS('tamperRT', rtDS);
                }
                if(isConnectionDatastream(ds)){
                    laneDSColl.addDS('connectionRT', rtDS);
                }
            }
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);



    return (
        <Grid container spacing={2} direction={"column"}>
            <Grid item container spacing={2} style={{flexBasis: '33.33%', flexGrow: 0, flexShrink: 0}}>
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{height: "100%"}}>
                        <LaneStatus dataSourcesByLane={dataSourcesByLane}/>
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
