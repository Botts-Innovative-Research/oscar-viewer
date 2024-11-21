"use client";

import {Box, Grid } from "@mui/material";
import { SelectedEvent } from "../../../../types/new-types";
import VideoGrid from "./VideoGrid";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {Mode} from "osh-js/source/core/datasource/Mode";


export default function Media(props: { laneName: string}) {

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [gammaDatasources, setGammaDS] = useState(null);
    const [neutronDatasources, setNeutronDS] = useState(null);
    const [thresholdDatasources, setThresholdDS] = useState(null);
    const [chartReady, setChartReady] = useState<boolean>(false);

    let startTime = new Date().toISOString()

    let datasources: any[]=[];

    useEffect(() => {
        datasourceSetup();

    }, [laneMapRef.current]);


    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            if(laneid === props.laneName){
                laneDSMap.set(laneid, new LaneDSColl());
                for (let ds of lane.datastreams) {

                    let idx: number = lane.datastreams.indexOf(ds);
                    let rtDS = lane.datasourcesRealtime[idx];

                    rtDS.properties.startTime = startTime;
                    rtDS.properties.endTime = "2055-01-01T08:13:25.845Z"

                    let laneDSColl = laneDSMap.get(laneid);

                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){
                        laneDSColl?.addDS('gammaRT', rtDS);
                        setGammaDS( rtDS);
                    }

                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/neutron-gross-count")){
                        laneDSColl?.addDS('neutronRT', rtDS);
                        setNeutronDS(rtDS);

                    }
                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/threshold")){
                        laneDSColl?.addDS('gammaTrshldRT', rtDS);
                        setThresholdDS(rtDS);
                    }
                }
                setDataSourcesByLane(laneDSMap);

            }
        }

    }, [laneMapRef.current]);


    useEffect(()=>{
        if(gammaDatasources){
            datasources.push(gammaDatasources)
        }
        if(thresholdDatasources){
            datasources.push(thresholdDatasources)
        }
    }, [gammaDatasources, thresholdDatasources])



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
        <Box sx={{flexGrow: 1, overflowX: "auto"}}>
            <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                <Grid item xs={12} md={6}>
                    <ChartLane  laneName={props.laneName} setChartReady={setChartReady}  datasources={{
                        gamma: gammaDatasources,
                        neutron: neutronDatasources,
                        threshold: thresholdDatasources
                    }}/>
                </Grid>
                <Grid item xs={12} md={6}>
                    <VideoGrid laneName={props.laneName}/>
                </Grid>
          </Grid>
        </Box>
  );
}
