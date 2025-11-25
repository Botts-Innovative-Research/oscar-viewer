/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

'use client'

import {
    Box,
    Button,
    IconButton,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {
    selectEventPreview,
    setEventPreview,
    setSelectedRowId,
    setShouldForceAlarmTableDeselect
} from "@/lib/state/EventPreviewSlice";
import {selectCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import AdjudicationData, {
    IAdjudicationData,
} from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {setSelectedEvent, triggerEventTableRefresh, setAdjudicatedEventId} from "@/lib/state/EventDataSlice";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import { setEventData } from "@/lib/state/EventDetailsSlice";
import CircularProgress from "@mui/material/CircularProgress";
import EventMedia from "@/app/_components/event-preview/EventMedia";
import SecondaryInspectionSelect from "@/app/_components/adjudication/SecondaryInspectionSelect";
import {generateAdjudicationCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import { EventTableData } from "@/lib/data/oscar/TableHelpers";

export function EventPreview() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const eventPreview = useSelector(selectEventPreview);

    const prevEventIdRef = useRef<string | null>(null);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof ConSysApi[]>>(new Map<string, typeof ConSysApi[]>());
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    // Chart Specifics
    const [gammaDatasources, setGammaDatasources] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDatasources] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDatasources] = useState<typeof ConSysApi[]>([]);

    // Adjudication Specifics
    const [adjFormData, setAdjFormData] = useState<IAdjudicationData | null>();
    const [notes, setNotes] = useState<string>("");
    const [adjudicationCode, setAdjudicationCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [adjudication, setAdjudication] = useState<AdjudicationData | null>();
    const [secondaryInspection, setSecondaryInspection] = useState<"NONE" | "COMPLETED"| "REQUESTED" | "">("");

    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);
    const [colorStatus, setColorStatus] = useState('')

    const [localSelectedEvent, setLocalSelectedEvent] = useState<EventTableData>(eventPreview.eventData);

    const handleAdjudicationCode = (value: AdjudicationCode) => {
        let newAdjData: IAdjudicationData = {
            occupancyCount: eventPreview.eventData.occupancyCount,
            time: new Date().toISOString(),
            id: randomUUID(),
            username: "",
            feedback: notes,
            adjudicationCode: value,
            isotopes: [],
            secondaryInspectionStatus: secondaryInspection,
            filePaths: [],
            occupancyObsId: eventPreview.eventData.occupancyObsId,
            alarmingSystemUid: eventPreview.eventData.rpmSystemId
        }

        let adjudicationData = new AdjudicationData(
            new Date().toISOString(),
            eventPreview.eventData.occupancyCount,
            eventPreview.eventData.occupancyObsId,
            eventPreview.eventData.rpmSystemId
        );

        adjudicationData.setFeedback(notes);
        adjudicationData.setAdjudicationCode(value);

        setAdjudicationCode(value);
        setAdjFormData(newAdjData);
        setAdjudication(adjudicationData);
    }

    const handleNotes = (event: React.ChangeEvent<HTMLInputElement>) => {
        let notesValues = event.target.value;
        setNotes(notesValues);
    }

    const sendAdjudicationData = async () => {
        if (!adjudication) {
            setAdjSnackMsg('Please fill out the adjudication fields.');
            setColorStatus('error')
            setOpenSnack(true);
            return;
        }

        const phenomenonTime = new Date().toISOString();
        const comboData = adjudication;

        comboData.setFeedback(notes);
        comboData.setTime(phenomenonTime);
        comboData.setSecondaryInspectionStatus(secondaryInspection);

        // send to server
        const currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        await submitAdjudication(currLaneEntry, comboData)
    }

    useEffect(() => {
        setLocalSelectedEvent(eventPreview.eventData);
    }, [eventPreview.eventData]);

    const submitAdjudication = async(currLaneEntry: any, comboData: any) => {
        try{
            let ds = currLaneEntry.datastreams.find((ds: any) => ds.properties.id == eventPreview.eventData.dataStreamId);
            let streams = currLaneEntry.controlStreams.length > 0 ? currLaneEntry.controlStreams : await currLaneEntry.parentNode.fetchNodeControlStreams();
            let adjControlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));

            if (!adjControlStream){
                console.error("Failed: cannot find adjudication control stream for occupancy.");
                return;
            }

            // If no occupancy obs ID (from live data) we can fetch it before adjudicating based on the latest occupancyCount match
            if (comboData.occupancyObsId == null) {

                let query = await ds.searchObservations(new ObservationFilter({
                    filter: `startTime=${eventPreview.eventData.startTime},endTime=${eventPreview.eventData.endTime}`
                }), 10000);

                const occupancyObservation: any[] = await query.nextPage();

                if (occupancyObservation.length == 0) {
                    setAdjSnackMsg('Failed to adjudicate occupancy. Please refresh the page and try again.');
                    setColorStatus('error')
                    setOpenSnack(true);
                    return;
                }

                eventPreview.eventData.occupancyObsId = occupancyObservation[0].id;
                eventPreview.eventData.rpmSystemId = ds.properties["system@id"];
                comboData.occupancyObsId = occupancyObservation[0].id;
                comboData.alarmingSystemUid = ds.properties["system@id"];


            }

            const response = await sendCommand(
                currLaneEntry.parentNode,
                adjControlStream.properties.id,
                generateAdjudicationCommandJSON(
                    comboData.feedback,
                    comboData.adjudicationCode,
                    comboData.isotopes,
                    comboData.secondaryInspectionStatus,
                    comboData.filePaths,
                    comboData.occupancyObsId,
                    comboData.vehicleId
                )
            );

            if (!response.ok) {
                setAdjSnackMsg('Adjudication failed to submit.')
                setColorStatus('error')
                return;
            }


            eventPreview.eventData.adjudicatedData = comboData;


            // Dispatch actions
            dispatch(setSelectedEvent(eventPreview.eventData));
            dispatch(setAdjudicatedEventId(eventPreview.eventData.id));
            // dispatch(triggerEventTableRefresh());

            setAdjSnackMsg('Adjudication successful for Occupancy ID: ' + eventPreview.eventData.occupancyCount);
            setColorStatus('success')

        } catch(error) {
            console.error( error)
            setColorStatus('error')
        } finally {
            setOpenSnack(true);
        }
    }

    const resetAdjudicationData = () => {
        setAdjFormData(null);
        setAdjudication(null);
        setNotes("");
        setAdjudicationCode(AdjudicationCodes.codes[0]);
    }

    const handleCloseRounded = () => {
        dispatch(setEventPreview({
            isOpen: false,
            eventData: null
        }));
        dispatch(setShouldForceAlarmTableDeselect(true))
        dispatch(setSelectedRowId(null))
        resetAdjudicationData();
    }

    const handleInspectionSelect = (value: "NONE" | "REQUESTED" | "COMPLETED") => {
        setSecondaryInspection(value);
    }

    const handleExpand = () => {
        dispatch(setEventData(eventPreview.eventData));
        dispatch(setSelectedRowId(eventPreview.eventData.id))
        dispatch(setSelectedEvent(eventPreview.eventData));

        router.push("/event-details");
    }


    useEffect(() => {
        if (eventPreview.eventData?.occupancyCount !== prevEventIdRef.current) {

            if (prevEventIdRef.current) {
                setDatasourcesReady(false);
            }

            prevEventIdRef.current = eventPreview.eventData?.occupancyCount;

            if (eventPreview.eventData?.laneId && laneMapRef.current) {
                callCollectDataSources();
                dispatch(setEventData(eventPreview.eventData));
            }
        }

    }, [eventPreview.eventData?.occupancyCount]);

    const collectDataSources = useCallback(async() => {
        if (!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;

        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        let datasources = await currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);

        setLocalDSMap(datasources);

        const updatedGamma = datasources.get("gamma") || [];
        const updatedNeutron = datasources.get("neutron") || [];
        const updatedThreshold = datasources.get("gammaTrshld") || [];

        setGammaDatasources(updatedGamma);
        setNeutronDatasources(updatedNeutron);
        setThresholdDatasources(updatedThreshold);

        setDatasourcesReady(true);
    }, [eventPreview, laneMapRef]);


    async function callCollectDataSources(){
        await collectDataSources();
    }

    useEffect(() => {
        gammaDatasources.forEach(ds => ds.connect());
        neutronDatasources.forEach(ds => ds.connect());
        thresholdDatasources.forEach(ds => ds.connect());
    }, [datasourcesReady]);

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnack(false);
        handleCloseRounded();
    };

    return (
        <Stack
            p={1}
            display={"flex"}
            spacing={1}
        >
            <Stack
                direction={"row"}
                justifyContent={"space-between"}
                spacing={1}
            >
                <Stack
                    direction={"row"}
                    spacing={1}
                    alignItems={"center"}
                >
                    <Typography
                        variant="h6"
                    >
                        Occupancy ID: {eventPreview.eventData.occupancyCount}
                    </Typography>
                    <IconButton
                        onClick={handleExpand}
                        aria-label="expand"
                    >
                        <OpenInFullRoundedIcon
                            fontSize="small"
                        />
                    </IconButton>
                </Stack>
                <IconButton
                    onClick={handleCloseRounded}
                    aria-label="close"
                >
                    <CloseRoundedIcon fontSize="small"/>
                </IconButton>
            </Stack>

            { datasourcesReady ? (
                    <Box>
                        <EventMedia
                            selectedNode={laneMapRef.current.get(eventPreview.eventData.laneId).parentNode}
                            datasources={{
                                gamma: gammaDatasources[0],
                                neutron: neutronDatasources[0],
                                threshold: thresholdDatasources[0]
                            }}
                            mode={"preview"}
                            eventData={eventPreview.eventData}
                        />
                    </Box>

                ) :
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                    <CircularProgress/>
                </Box>
            }
            <Stack spacing={2}>
                <AdjudicationSelect
                    adjCode={adjudicationCode}
                    onSelect={handleAdjudicationCode}
                />

                <SecondaryInspectionSelect
                    secondarySelectVal={secondaryInspection}
                    onSelect={handleInspectionSelect}
                />

                <TextField
                    onChange={handleNotes}
                    id="outlined-multiline-static"
                    label="Notes"
                    multiline
                    rows={4}
                />

                <Stack
                    direction={"row"}
                    spacing={10}
                    sx={{width: "100%"}}
                    justifyContent={"center"}
                >

                    <Button
                        onClick={sendAdjudicationData}
                        variant={"contained"}
                        size={"small"}
                        fullWidth={false}
                        color={"success"}
                        disabled={adjFormData === null}
                        sx={{width: "25%"}}
                    >
                        Submit
                    </Button>

                    <Snackbar
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        open={openSnack}
                        autoHideDuration={1500}
                        onClose={handleCloseSnack}
                        message={adjSnackMsg}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: colorStatus === 'success' ? 'green' : 'red',
                            },
                        }}
                    />

                    <Button
                        onClick={resetAdjudicationData}
                        variant={"contained"}
                        size={"small"}
                        fullWidth={false}
                        color={"secondary"}
                        sx={{width: "25%"}}
                    >
                        Reset
                    </Button>
                </Stack>
            </Stack>
        </Stack>
    )
}