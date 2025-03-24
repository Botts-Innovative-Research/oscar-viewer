"use client";

import {Box, Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import BackButton from "../_components/BackButton";
import {useSearchParams} from 'next/navigation'
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import Table2 from "@/app/_components/event-table/TableType2";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import StatusTables from "@/app/_components/lane-view/StatusTables";
import {
    isGammaDatastream,
    isNeutronDatastream,
    isTamperDatastream,
    isThresholdDatastream, isVideoDatastream
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useAppDispatch} from "@/lib/state/Hooks";
import {setCurrentLane} from "@/lib/state/LaneViewSlice";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import VideoGrid from "@/app/_components/lane-view/VideoGrid";



export default function LaneViewPage() {
    const dispatch = useAppDispatch();

    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const {laneMapRef} = useContext(DataSourceContext);

    const searchParams = useSearchParams();
    const searchLane = searchParams.get("name");

    const currentLane = searchLane ?? useSelector((state: RootState) => state.laneView.currentLane);

    const [gammaDatasources, setGammaDS] = useState(null);
    const [neutronDatasources, setNeutronDS] = useState(null);
    const [thresholdDatasources, setThresholdDS] = useState(null);
    const [videoDatasources, setVideoDS] = useState(null);
    const [tamperDatasources, setTamperDS] = useState(null);
    const [chartReady, setChartReady] = useState<boolean>(false);


    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    const [toggleView, setToggleView] = useState("occupancy");


    const toggleButtons = [
        <ToggleButton  value={"occupancy"} key={"occupancy"}>Occupancy</ToggleButton>,
        <ToggleButton  value={"alarm"} key={"alarm"}>Alarm</ToggleButton>
    ];

    useEffect(() => {
        if (searchLane) {
            dispatch(setCurrentLane(searchLane));
        }
    }, [searchLane]);

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
    }

    const datasourceSetup = useCallback(() => {
        // @ts-ignore
        const laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {

            if(laneid === currentLane){

                const laneDSColl = new LaneDSColl();
                laneDSMap.set(laneid, laneDSColl);

                lane.datastreams.forEach((ds, idx) => {

                    const rtDS = lane.datasourcesRealtime[idx];

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

                });
            }

            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);


    useEffect(() => {
        if(laneMapRef?.current && currentLane)
            datasourceSetup();
    }, [laneMapRef.current, currentLane]);



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

        if(tamperDatasources){
            tamperDatasources.connect();
        }
    }, [thresholdDatasources, gammaDatasources, neutronDatasources, tamperDatasources]);


    console.log("ds",dataSourcesByLane);

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

                <Box sx={{flexGrow: 1, overflowX: "auto"}}>
                    <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                        <Grid item xs={12} md={6}>
                            <ChartLane
                                laneName={currentLane} setChartReady={setChartReady}
                                datasources={{
                                    gamma: gammaDatasources,
                                    neutron: neutronDatasources,
                                    threshold: thresholdDatasources
                                }}/>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <VideoGrid  laneName={currentLane}/>
                        </Grid>
                    </Grid>
                </Box>

              {/*<Media laneName={currentLane} gammaDs={gammaDatasources} neutronDs={neutronDatasources} thresholdDs={thresholdDatasources} videoDs={videoDatasources}/>*/}
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
                        <Table2 tableMode={'eventLogPerLane'} laneMap={laneMap} viewLane viewSecondary viewAdjudicated/>
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
