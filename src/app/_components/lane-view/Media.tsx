"use client";

import {Box, Grid } from "@mui/material";
import VideoGrid from "../lane-view/VideoGrid";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ChartLane from "@/app/_components/lane-view/ChartLane";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";

interface LaneWithVideo {
    laneName: string,
    videoSources: typeof SweApi[]
}
export default function Media(props: {
  laneName: string,
}) {

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    
    //VIDEO
    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
    const [dsVideo, setDsVideo] = useState([]);
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    
    //CHART
    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [chartReady, setChartReady] = useState<boolean>(false);


    useEffect(() => {
        if(laneMap.size > 0 && dsVideo.length > 0) {
            const videos: LaneWithVideo[] = []

            laneMap.forEach((value, key) => {

                let ds: LaneMapEntry = laneMap.get(key);
                dsVideo.forEach((dss) =>{
                    const videoSources = ds.datasourcesRealtime.filter((item) => item.properties.resource === ("/datastreams/" + dss.properties.id + "/observations"));

                    if (videoSources.length > 0) {
                        const laneWithVideo: LaneWithVideo = {
                            laneName: key,
                            videoSources: videoSources,
                        };

                        videos.push(laneWithVideo);
                    }
                })
            });
            setVideoList(videos);
        }
    }, [laneMap, dsVideo]);

    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();
        let videoDs: any[] = [];

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            
            if(laneid === props.laneName){
                laneDSMap.set(laneid, new LaneDSColl());
                for (let ds of lane.datastreams) {

                    let idx: number = lane.datastreams.indexOf(ds);
                    let rtDS = lane.datasourcesRealtime[idx];

                    rtDS.properties.startTime = "now"
                    rtDS.properties.endTime = "2055-01-01T08:13:25.845Z"

                    let laneDSColl = laneDSMap.get(laneid);

                    if (ds.properties.observedProperties[0].definition.includes("http://sensorml.com/ont/swe/property/RasterImage")) {
                        videoDs.push(ds);
                    }

                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){
                        laneDSColl?.addDS('gammaRT', rtDS);
                        setGammaDS(prevState => [...prevState, ds]);

                    }
                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/neutron-gross-count")){
                        laneDSColl?.addDS('neutronRT', rtDS);
                        setNeutronDS(prevState => [...prevState, ds]);
                    }

                    if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/threshold")){
                        laneDSColl?.addDS('gammaTrshldRT', rtDS);
                        setThresholdDS(prevState => [...prevState, ds]);
                    }

                }
                setDsVideo(videoDs);
                setDataSourcesByLane(laneDSMap);
            }
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current, laneMap, props.laneName, dsVideo]);

    useEffect(() => {
        // gammaDatasources.forEach(ds => {
        //     ds.connect();
        // });
        // neutronDatasources.forEach(ds => {
        //     ds.connect();
        // });
        // thresholdDatasources.forEach(ds => {
        //     ds.connect();
        // });

    }, [gammaDatasources, neutronDatasources, thresholdDatasources]);

    return (
        <Box>
            <Grid container direction="row" spacing={2} justifyContent={"center"} alignItems={"center"}>
                <Grid item xs={12} sm={6}>
                    <ChartLane laneName={props.laneName} gammaDatasources={gammaDatasources[0]} neutronDatasources={neutronDatasources[0]} thresholdDatasources={thresholdDatasources[0]} setChartReady={setChartReady}/>
                </Grid>

                <Grid item xs>
                    <VideoGrid videoList={videoList}/>
                </Grid>
          </Grid>
        </Box>
  );
}
