/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IconButton, Stack, TextField, Typography} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AdjudicationSelect from "@/app/_components/event-preview/AdjudicationSelect";
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectEventPreview, setEventPreview, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";
import ChartIntercept from "@/app/_components/event-preview/ChartIntercept";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";


export function EventPreview() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector(selectEventPreview);
    const [dataSync, setDataSync] = useState<typeof DataSynchronizer | undefined>(undefined);
    const dsMapRef = useRef<Map<string, typeof SweApi[]>>();
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
    const [dataSourceCheckDepth, setDataSourceCheckDepth] = useState<number>(0);
    const [dataSyncReady, setDataSyncReady] = useState<boolean>(false);
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const syncRef = useRef<typeof DataSynchronizer>();
    const [dataSyncCreated, setDataSyncCreated] = useState<boolean>(false);


    // Chart Specifics
    const [gammaDatasources, setGammaDS] = useState<typeof SweApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof SweApi[]>([]);
    const [occDatasources, setOccDS] = useState<typeof SweApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof SweApi[]>([]);
    const [chartReady, setChartReady] = useState<boolean>(false);

    // Video Specifics
    const [videoReady, setVideoReady] = useState<boolean>(false);
    const [videoDatasources, setVideoDatasources] = useState<typeof SweApi[]>([]);
    const [activeVideoIDX, setActiveVideoIDX] = useState<number>(0);

    const handleAdjudication = (value: string) => {
        console.log("Adjudication Value: ", value);
    }

    const handleCloseRounded = () => {
        console.log("Close Rounded");
        dispatch(setEventPreview({
            isOpen: false,
            eventData: null
        }));
        dispatch(setShouldForceAlarmTableDeselect(true))
    }

    const handleExpand = () => {
        router.push("/event-detail");
    }

    useMemo(() => {
        // create dsMapRef of eventPreview
        if (eventPreview) {
            dsMapRef.current = laneMapRef.current.get(eventPreview.eventData.laneId).getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
            console.log("EventPreview DS Map", dsMapRef.current);
            setLocalDSMap(dsMapRef.current);
        }
    }, [eventPreview]);

    const addDataSynchronizerDataSources = useCallback(() => {

        // TODO: maintain a list of the current datasources that should be in the Synchronizer and totally replace
        // the list of datasources in the Synchronizer with the new list, but beware if this stops the synchro from
        // keeping current time
        let allDS = [
            ...(gammaDatasources || []),
            ...(neutronDatasources || []),
            ...(thresholdDatasources || []),
        ];

        if(videoDatasources[activeVideoIDX]) {
            allDS.push(videoDatasources[activeVideoIDX]);
        }else{
            console.log("No Video DataSources to add to DataSync", videoDatasources, activeVideoIDX);
        }

        console.log("Adding DataSources to DataSync", allDS);
        if(dataSyncCreated) {
            for (let ds of allDS) {
                syncRef.current.addDataSource(ds);
            }
        }

        // if (allDS.length > 0) {
            // let newSync = new DataSynchronizer({
            //     dataSources: allDS,
            //     replaySpeed: 1.0,
            //     startTime: eventPreview.eventData.startTime,
            //     endTime: "Now",
            // });
            // setDataSync(newSync);

        // }
    }, [localDSMap, eventPreview, activeVideoIDX, syncRef, dataSyncCreated]);

    const collectDatasources = useCallback(() => {
        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        console.log("Collecting DataSources...", currLaneEntry, currentLane);

        let tempDSMap = new Map<string, typeof SweApi[]>();
        if (currLaneEntry) {
            let datasources = currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
            console.log("DataSources", datasources);
            setLocalDSMap(datasources);
            tempDSMap = datasources;
        }
        console.log("LocalDSMap", localDSMap);

        setGammaDS(tempDSMap.get("gamma"));
        setNeutronDS(tempDSMap.get("neutron"));
        setThresholdDS(tempDSMap.get("gammaTrshld"));
        setVideoDatasources(tempDSMap.get("video"));

    }, [eventPreview, laneMapRef]);

    useEffect(() => {
        if(!syncRef.current && !dataSyncCreated){
            syncRef.current = new DataSynchronizer({
                dataSources: [],
                replaySpeed: 1.0,
                startTime: eventPreview.eventData.startTime,
                endTime: "Now",
            });
            setDataSync(syncRef.current);

            if(syncRef.current){
                setDataSyncCreated(true);
            }
        }
    }, [syncRef, dataSyncCreated]);

    useEffect(() => {
        collectDatasources();
    }, [eventPreview, laneMapRef]);

    useEffect(() => {
        if (localDSMap.size > 0 && dataSyncCreated) {
            addDataSynchronizerDataSources();
        }
    }, [localDSMap, eventPreview, dataSyncCreated]);

    useEffect(() => {
        if (chartReady && videoReady) {
            console.log("Chart Ready, Starting DataSync");
            dataSync.connect();
            console.log("DataSync Connected", dataSync);
        } else {
            console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady]);

    return (
        <Stack p={1} display={"flex"}>
            <Stack direction={"row"} justifyContent={"space-between"} spacing={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Typography variant="h6">Occupancy ID: {eventPreview.eventData.occupancyId}</Typography>
                    <IconButton onClick={handleExpand} aria-label="expand">
                        <OpenInFullRoundedIcon fontSize="small"/>
                    </IconButton>
                </Stack>
                <IconButton onClick={handleCloseRounded} aria-label="close">
                    <CloseRoundedIcon fontSize="small"/>
                </IconButton>
            </Stack>
            <ChartIntercept gammaDatasources={gammaDatasources} neutronDatasources={neutronDatasources}
                            thresholdDatasources={thresholdDatasources} occDatasources={occDatasources}
                            setChartReady={setChartReady}/>
            <LaneVideoPlayback videoDatasources={videoDatasources} setVideoReady={setVideoReady}
                               dataSynchronizer={dataSync}
                               addDataSource={setActiveVideoIDX}/>
            <AdjudicationSelect onSelect={handleAdjudication}/>
            <TextField
                id="outlined-multiline-static"
                label="Notes"
                multiline
                rows={4}
            />
        </Stack>
    )
}
