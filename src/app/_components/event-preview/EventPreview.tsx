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
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";


export function EventPreview(eventPreview: { isOpen: boolean, eventData: EventTableData | null }) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    // const eventPreview = useSelector(selectEventPreview);
    const dsMapRef = useRef<Map<string, typeof SweApi[]>>();
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof SweApi[]>>(new Map<string, typeof SweApi[]>());
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
    const [currentTime, setCurrentTime] = useState<number>(0);
    const gammaChartRef = useRef<any>();
    const neutronChartRef = useRef<any>();


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
        router.push("/event-details");
    }

    function disconnectDSArray(dsArray: typeof SweApi[]) {
        dsArray.forEach(ds => {
            ds.disconnect();
        });
    }

    function setChartRef(type: string, ref: any) {
        if (type === "gamma") {
            gammaChartRef.current = ref;
        } else if (type === "neutron") {
            neutronChartRef.current = ref;
        }

    }

    /*useMemo(() => {
       /!* if(dsMapRef.current.size > 0) {
            disconnectDSArray(gammaDatasources);
            disconnectDSArray(neutronDatasources);
            disconnectDSArray(thresholdDatasources);
            disconnectDSArray(occDatasources);
        }
        // create dsMapRef of eventPreview
        if (eventPreview.isOpen) {
            dsMapRef.current = laneMapRef.current.get(eventPreview.eventData.laneId).getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);
            console.log("EventPreview DS Map", dsMapRef.current);
            setLocalDSMap(dsMapRef.current);
        }*!/
    }, [eventPreview]);*/


    const collectDataSources = useCallback(() => {

        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);
        disconnectDSArray(occDatasources);

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
        setDatasourcesReady(true);

    }, [eventPreview, laneMapRef]);

    const createDataSync = useCallback(() => {
        if (!syncRef.current && !dataSyncCreated && videoDatasources.length > 0) {
            syncRef.current = new DataSynchronizer({
                dataSources: videoDatasources,
                replaySpeed: 1.0,
                startTime: eventPreview.eventData.startTime,
                // endTime: eventPreview.eventData.endTime,
                endTime: "now",
            });
            syncRef.current.onTime
            setDataSyncCreated(true);
        }
    }, [syncRef, dataSyncCreated, datasourcesReady, videoDatasources]);

    useEffect(() => {
        collectDataSources();
    }, [eventPreview, laneMapRef]);

    useEffect(() => {
        createDataSync();
    }, [gammaDatasources, neutronDatasources, thresholdDatasources, occDatasources, syncRef, dataSyncCreated, datasourcesReady]);


    useEffect(() => {
        if (chartReady && videoReady) {
            console.log("Chart Ready, Starting DataSync");
            gammaDatasources.forEach(ds => {
                ds.connect();
            });
            neutronDatasources.forEach(ds => {
                ds.connect();
            });
            thresholdDatasources.forEach(ds => {
                ds.connect();
            });
            occDatasources.forEach(ds => {
                ds.connect();
            });
            syncRef.current.connect().then(() => {
                console.log("DataSync Should Be Connected", syncRef.current);
            });
            if (syncRef.current.isConnected()) {
                console.log("DataSync Connected!!!");
            } else {
                console.log("DataSync Not Connected... :(");
            }
        } else {
            // console.log("Chart Not Ready, cannot start DataSynchronizer...");
        }
    }, [chartReady, syncRef, videoReady, dataSyncCreated, dataSyncReady, datasourcesReady]);

    useEffect(() => {
        const interval = setInterval(async () => {
            let currTime = await syncRef.current.getCurrentTime();
            if (currentTime !== undefined) {
                setCurrentTime(currTime);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.log("Event Preview Changed", eventPreview);
    }, [eventPreview]);

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
            {/*<ChartTimeHighlight gammaDatasources={gammaDatasources} neutronDatasources={neutronDatasources}*/}
            {/*                    thresholdDatasources={thresholdDatasources} occDatasources={occDatasources}*/}
            {/*                    setChartReady={setChartReady} modeType="preview" currentTime={currentTime}/>*/}
            {datasourcesReady && (
                <>
                    <ChartTimeHighlight key={eventPreview.eventData.id}
                        datasources={{ gamma: gammaDatasources[0], neutron: neutronDatasources[0], threshold: thresholdDatasources[0] }}
                        setChartReady={setChartReady}
                        modeType="preview"
                        currentTime={currentTime}
                    />
                    <LaneVideoPlayback key={eventPreview.eventData.id}
                        videoDatasources={videoDatasources}
                        setVideoReady={setVideoReady}
                        dataSynchronizer={syncRef.current}
                        addDataSource={setActiveVideoIDX}
                    />
                </>
            )}
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
