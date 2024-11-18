/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    Box,
    Button,
    Grid,
    IconButton,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    TextField,
    ToggleButton, ToggleButtonGroup,
    Typography
} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectCurrentUser, setEventPreview, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import LaneVideoPlayback from "@/app/_components/event-preview/LaneVideoPlayback";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import AdjudicationData, {
    createAdjudicationObservation,
    findObservationIdBySamplingTime,
    generateCommandJSON,
    IAdjudicationData,
    sendSetAdjudicatedCommand
} from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {updateSelectedEventAdjudication} from "@/lib/state/EventDataSlice";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";


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
    const currentUser = useSelector(selectCurrentUser);


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

    // Adjudication Specifics
    const [adjFormData, setAdjFormData] = useState<IAdjudicationData | null>();
    const [notes, setNotes] = useState<string>("");
    const [adjudicationCode, setAdjudicationCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [adjudication, setAdjudication] = useState<AdjudicationData | null>();

    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);

    const handleAdjudicationCode = (value: AdjudicationCode) => {
        console.log("Adjudication Value: ", value);
        let newAdjData: IAdjudicationData = {
            time: new Date().toISOString(),
            id: randomUUID(),
            username: currentUser,
            feedback: notes,
            adjudicationCode: value,
            isotopes: "",
            secondaryInspectionStatus: "NONE",
            filePaths: "",
            occupancyId: eventPreview.eventData.occupancyId,
            alarmingSystemUid: eventPreview.eventData.systemIdx
        }
        let adjudicationData = new AdjudicationData(currentUser, eventPreview.eventData.occupancyId,
            eventPreview.eventData.systemIdx);
        adjudicationData.setFeedback(notes);
        adjudicationData.setAdjudicationCode(value);
        console.log("[ADJ] New Adjudication Data, Ready to Send: ", newAdjData);
        setAdjudicationCode(value);
        setAdjFormData(newAdjData);
        setAdjudication(adjudicationData);
    }
    const handleNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
        let notesValues = event.target.value;
        console.log("[ADJ] Notes: ", notesValues);
        setNotes(notesValues);
    }
    const sendAdjudicationData = async () => {
        let phenomenonTime = new Date().toISOString();
        // let comboData = adjFormData;
        let comboData = adjudication;
        // comboData.feedback = notes;
        comboData.setFeedback(notes);
        // comboData.time = phenomenonTime;
        comboData.setTime(phenomenonTime);
        // let observation = createAdjudicationObservation(comboData, phenomenonTime);
        let observation = comboData.createAdjudicationObservation();
        console.log("[ADJ] Sending Adjudication Data: ", observation);
        // send to server
        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        const ep = currLaneEntry.parentNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + adjDsID + "/observations";
        try {
            let resp = await fetch(ep, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                // body: JSON.stringify(observation),
                body: observation,
                mode: "cors"
            });
            console.log("[ADJ] Response: ", resp);

            // send command
            // we can use endTime as it is the same a resultTime in testing, this may not be true in practice but this is a stop-gap fix anyway
            let refObservation = await findObservationIdBySamplingTime(currLaneEntry.parentNode, eventPreview.eventData.dataStreamId, eventPreview.eventData.endTime)

            // guard, maybe add an appropriate snackbar
            if (!refObservation) return
            await sendSetAdjudicatedCommand(currLaneEntry.parentNode, currLaneEntry.adjControlStreamId,
                generateCommandJSON(refObservation.id, true));
            dispatch(updateSelectedEventAdjudication(comboData));

            if (resp.ok) {
                setAdjSnackMsg('Adjudication Submitted Successfully')
                resetAdjudicationData();
                dispatch(setEventPreview({
                    isOpen: false,
                    eventData: null
                }));
                dispatch(setShouldForceAlarmTableDeselect(true))
            } else {
                setAdjSnackMsg('Adjudication Submission Failed. Check your connection.')
            }
        } catch (error) {
            setAdjSnackMsg('Adjudication failed to submit.')
        }

        setOpenSnack(true)
    }

    const resetAdjudicationData = () => {
        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);
        disconnectDSArray(occDatasources);
        setAdjFormData(null);
        setAdjudication(null);
        setNotes("");
        setAdjudicationCode(AdjudicationCodes.codes[0]);
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

            let currTime = await syncRef.current?.getCurrentTime();
            if (currentTime !== undefined) {
                setCurrentTime(currTime);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.log("Event Preview Changed", eventPreview);
    }, [eventPreview]);

    const handleCloseSnack = (
        event: React.SyntheticEvent | Event,
        reason?: SnackbarCloseReason,
    ) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };


    return (
        <Stack p={1} display={"flex"} spacing={1}>
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


            {datasourcesReady && (
                <Box>
                    <ChartTimeHighlight
                        datasources={{
                            gamma: gammaDatasources[0],
                            neutron: neutronDatasources[0],
                            threshold: thresholdDatasources[0]
                        }}
                        setChartReady={setChartReady}
                        modeType="preview"
                        currentTime={currentTime}
                    />

                    <LaneVideoPlayback
                        videoDatasources={videoDatasources}
                        setVideoReady={setVideoReady}
                        dataSynchronizer={syncRef.current}
                        addDataSource={setActiveVideoIDX}
                    />

                </Box>
            )}


            <Stack spacing={2}>
                <AdjudicationSelect adjCode={adjudicationCode} onSelect={handleAdjudicationCode}/>
                <TextField
                    onChange={handleNotes}
                    id="outlined-multiline-static"
                    label="Notes"
                    multiline
                    rows={4}
                />
                <Stack direction={"row"} spacing={10} sx={{width: "100%"}} justifyContent={"center"}>
                    <Button onClick={sendAdjudicationData} variant={"contained"} size={"small"} fullWidth={false}
                            color={"success"}
                            disabled={adjFormData === null}
                            sx={{width: "25%"}}>Submit</Button>
                    <Snackbar
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        open={openSnack}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={adjSnackMsg}
                    />

                    <Button onClick={resetAdjudicationData} variant={"contained"} size={"small"} fullWidth={false}
                            color={"secondary"}
                            sx={{width: "25%"}}>Reset</Button>
                </Stack>
            </Stack>
        </Stack>
    )
}