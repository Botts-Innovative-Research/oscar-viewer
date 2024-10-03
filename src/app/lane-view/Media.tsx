"use client";

import {Grid, Typography } from "@mui/material";
import { SelectedEvent } from "types/new-types";
import VideoGrid from "./VideoGrid";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectEventPreview, setEventPreview, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ChartLane from "@/app/lane-view/ChartLane";


export default function Media(props: {
  event: SelectedEvent;
  laneName: string,
    currentTime: string
}) {

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [gammaDatasources, setGammaDS] = useState<any[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<any[]>([]);
    const [occDatasources, setOccDS] = useState<any[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<any[]>([]);
    const [chartReady, setChartReady] = useState<boolean>(false);


    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            if(laneid === props.laneName){
                laneDSMap.set(laneid, new LaneDSColl());
                let tempDSMap = new Map<string, typeof SweApi[]>();
                for (let ds of lane.datastreams) {


                    let idx: number = lane.datastreams.indexOf(ds);
                    let rtDS = lane.datasourcesRealtime[idx];
                    let batchDS = lane.datasourcesBatch[idx];
                    let laneDSColl = laneDSMap.get(laneid);


                    if (ds.properties.name.includes('Driver - Gamma Count')) {
                        laneDSColl?.addDS('gammaRT', rtDS);
                        laneDSColl?.addDS('gammaBatch', batchDS);
                        setGammaDS(prevState => [...prevState, batchDS]);
                    }

                    if (ds.properties.name.includes('Driver - Neutron Count')) {
                        laneDSColl?.addDS('neutronRT', rtDS);
                        laneDSColl?.addDS('neutronBatch', batchDS);
                        setNeutronDS(prevState => [...prevState, batchDS]);
                    }

                    if (ds.properties.name.includes('Driver - Gamma Threshold')) {
                        laneDSColl?.addDS('gammaTrshldRT', rtDS);
                        laneDSColl?.addDS('gammaTrshldBatch', batchDS);
                        setThresholdDS(prevState => [...prevState, batchDS]);
                    }

                    if (ds.properties.name.includes('Driver - Occupancy')) {
                        laneDSColl?.addDS('occRT', rtDS);
                        laneDSColl?.addDS('occBatch', batchDS);
                        setOccDS(prevState => [...prevState, batchDS]);
                    }

                    if (ds.properties.name.includes('Driver - Tamper')) {
                        laneDSColl?.addDS('tamperRT', rtDS);
                        laneDSColl?.addDS('tamperBatch', batchDS);
                    }
                }
                setDataSourcesByLane(laneDSMap);
            }
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);
    useEffect(() => {
        gammaDatasources.forEach(ds => {
            ds.connect();
        });
        neutronDatasources.forEach(ds => {
            ds.connect();
        });
        thresholdDatasources.forEach(ds => {
            ds.connect();
        });
    }, [gammaDatasources, neutronDatasources, thresholdDatasources]);


    return (
        <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
            <Grid item xs>
                <ChartLane  laneName={props.laneName} setChartReady={setChartReady} occDatasources={occDatasources} gammaDatasources={gammaDatasources} neutronDatasources={neutronDatasources} thresholdDatasources={thresholdDatasources} />
            </Grid>
            <Grid item xs>
                <VideoGrid laneName={props.laneName}/>
            </Grid>
      </Grid>


  );
}
