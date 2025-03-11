"use client";

import {Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import BackButton from "../_components/BackButton";
import {useSearchParams} from 'next/navigation'
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import Table2 from "@/app/_components/event-table/TableType2";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import {RootState} from "@/lib/state/Store";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import AlarmTable from "@/app/_components/event-table/AlarmTable";
import StatusTables from "@/app/_components/event-table/StatusTables";
import {
    isGammaDatastream,
    isNeutronDatastream,
    isTamperDatastream,
    isThresholdDatastream, isVideoDatastream
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";



export default function LaneViewPage() {

    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const searchParams = useSearchParams();
    const currentLane = searchParams.get("name");

    const [gammaDatasources, setGammaDS] = useState(null);
    const [neutronDatasources, setNeutronDS] = useState(null);
    const [thresholdDatasources, setThresholdDS] = useState(null);
    const [videoDatasources, setVideoDS] = useState(null);
    const [tamperDatasources, setTamperDS] = useState(null);

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    // const [filteredLaneMap, setFilteredLaneMap] = useState<Map<string, LaneMapEntry>>(null);

    const [toggleView, setToggleView] = useState("occupancy");

    let newMap = new Map<string, LaneMapEntry>();
    newMap.set(currentLane, laneMap.get(currentLane));


    const toggleButtons = [
        <ToggleButton  value={"occupancy"} key={"occupancy"}>Occupancy</ToggleButton>,
        <ToggleButton  value={"alarm"} key={"alarm"}>Alarm</ToggleButton>
    ];


    const handleToggle= (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
    }

    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            if(laneid === currentLane){
                laneDSMap.set(laneid, new LaneDSColl());
                for (let ds of lane.datastreams) {

                    let idx: number = lane.datastreams.indexOf(ds);
                    let rtDS = lane.datasourcesRealtime[idx];

                    rtDS.properties.startTime = new Date().toISOString();
                    rtDS.properties.endTime = "2055-01-01T08:13:25.845Z"

                    let laneDSColl = laneDSMap.get(laneid);

                    if(isGammaDatastream(ds)){
                        laneDSColl.addDS('gammaRT', rtDS);
                        setGammaDS(rtDS)
                    }
                    if(isNeutronDatastream(ds)){
                        laneDSColl.addDS('neutronRT', rtDS);
                        setNeutronDS(rtDS);
                    }
                    if(isTamperDatastream(ds)){
                        laneDSColl.addDS('tamperRT', rtDS);
                        setTamperDS(rtDS)

                    }
                    if(isThresholdDatastream(ds)){
                        laneDSColl?.addDS('gammaTrshldRT', rtDS);
                        setThresholdDS(rtDS);
                    }

                    if(isVideoDatastream(ds)) {
                        laneDSColl?.addDS('videoRT', rtDS);
                        setVideoDS(rtDS);
                    }

                }
            }
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);



    useEffect(() => {

        if(neutronDatasources){
            neutronDatasources.connect()
        }

        if(gammaDatasources){
            gammaDatasources.connect()
        }
        if(thresholdDatasources){
            thresholdDatasources.connect()
        }

    }, [thresholdDatasources, gammaDatasources, neutronDatasources]);


    return (
        <Stack spacing={2} direction={"column"}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={"auto"} >
                    <BackButton/>
                </Grid>
                <Grid item xs>
                    <Typography variant="h4">Lane View: {currentLane}</Typography>
                </Grid>
            </Grid>

          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%"}}>
              <LaneStatus dataSourcesByLane={dataSourcesByLane}/>
            </Paper>
          </Grid>

          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" }}>
              <Media laneName={currentLane} gammaDs={gammaDatasources} neutronDs={neutronDatasources} thresholdDs={thresholdDatasources} videoDs={videoDatasources}/>
            </Paper>
          </Grid>

          <Grid item container spacing={2} sx={{ width: "100%" }}>
            <Paper variant='outlined' sx={{ width: "100%" , padding: 2}}>
                <Grid container direction="column">
                    <Grid item sx={{ display: "flex", justifyContent: "center", padding: 1 }}>
                        <ToggleButtonGroup
                            size="small"
                            orientation="horizontal"
                            onChange={handleToggle}
                            exclusive
                            value={toggleView}
                            sx={{
                                borderRadius: 1,
                                boxShadow: 1,
                                '& .MuiToggleButton-root': {
                                    margin: 0.5,
                                    padding: "5px",
                                 },
                            }}
                        >
                            {toggleButtons}
                        </ToggleButtonGroup>
                    </Grid>
                    <Grid item sx={{ width: "100%", display: toggleView === 'occupancy' ? 'block' : 'none' }}>
                        <Table2 tableMode={'eventlog'} laneMap={newMap} viewLane viewSecondary viewAdjudicated/>
                    </Grid>
                    <Grid item sx={{ width: "100%", display: toggleView === 'alarm' ? 'block' : 'none' }}>
                        <StatusTables dataSourcesByLane={dataSourcesByLane} />
                    </Grid>
                </Grid>
            </Paper>
          </Grid>
        </Stack>
  );
}
