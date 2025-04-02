"use client";

import {Box, Grid, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import BackButton from "../_components/BackButton";
import {useSearchParams} from 'next/navigation'
import LaneStatus from "../_components/lane-view/LaneStatus";
import Media from "../_components/lane-view/Media";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import Table2 from "@/app/_components/event-table/TableType2";
import {useSelector} from "react-redux";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {
    isGammaDatastream,
    isNeutronDatastream,
    isTamperDatastream,
    isThresholdDatastream, isVideoDatastream
} from "@/lib/data/oscar/Utilities";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useAppDispatch} from "@/lib/state/Hooks";
import {selectLastToggleState, setCurrentLane, setToggleState} from "@/lib/state/LaneViewSlice";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import LaneStatusTable from "../_components/lane-view/LaneStatusTable";



export default function LaneViewPage() {
    const dispatch = useAppDispatch();

    const savedToggleState = useSelector(selectLastToggleState)
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const {laneMapRef} = useContext(DataSourceContext);

    const searchParams = useSearchParams();
    const searchLane = searchParams.get("name");

    const currentLane = searchLane ?? useSelector((state: RootState) => state.laneView.currentLane);

    const [gammaDatasources, setGammaDS] =  useState<typeof SweApi>();
    const [neutronDatasources, setNeutronDS] =  useState<typeof SweApi>();
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi>();
    const [videoDatasources, setVideoDS] =  useState<typeof SweApi[]>([]);
    const [tamperDatasources, setTamperDS] =  useState<typeof SweApi>();


    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    const [toggleView, setToggleView] = useState(savedToggleState);


    const toggleButtons = [
        <ToggleButton value={"occupancy"} key={"occupancy"}>Occupancy</ToggleButton>,
        <ToggleButton value={"alarm"} key={"alarm"}>Alarm</ToggleButton>
    ];

    useEffect(() => {
        if (searchLane) {
            dispatch(setCurrentLane(searchLane));
        }
    }, [searchLane]);

    const handleToggle = (event: React.MouseEvent<HTMLElement>, newView: string) =>{
        setToggleView(newView);
        dispatch(setToggleState(newView))
    }

    const collectDataSources = useCallback(() => {
        // @ts-ignore
        const laneDSMap = new Map<string, LaneDSColl>();

        const updatedVideo: typeof SweApi[] = [];
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
                        updatedVideo.push(rtDS)

                    }

                });
            }

            setVideoDS(updatedVideo);
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);


    useEffect(() => {
        if(laneMapRef?.current && currentLane)
            collectDataSources();
        console.log("lane view collected datasources")
    }, [laneMapRef.current, currentLane]);

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
              <Media
                  datasources={{
                      gamma: gammaDatasources,
                      neutron: neutronDatasources,
                      threshold: thresholdDatasources,
                      video: videoDatasources
                  }}

                  currentLane={currentLane}
              />

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
                        <LaneStatusTable laneMap={laneMap}/>
                    </Grid>
                </Grid>
            </Paper>
          </Grid>
        </Stack>
  );
}

