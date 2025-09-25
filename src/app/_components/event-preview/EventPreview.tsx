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
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {
    selectEventPreview,
    selectLatestGB,
    setEventPreview,
    setSelectedRowId,
    setShouldForceAlarmTableDeselect
} from "@/lib/state/EventPreviewSlice";
import {selectCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import ChartTimeHighlight from "@/app/_components/event-preview/ChartTimeHighlight";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import AdjudicationData, {
    fetchOccupancyObservation,
    generateCommandJSON,
    IAdjudicationData,
    sendSetAdjudicatedCommand
} from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {setSelectedEvent, updateSelectedEventAdjudication} from "@/lib/state/EventDataSlice";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import { setEventData } from "@/lib/state/EventDetailsSlice";
import {RootState} from "@/lib/state/Store";
import CircularProgress from "@mui/material/CircularProgress";
import {insertObservation} from "@/lib/data/osh/Node";

export function EventPreview() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const eventPreview = useSelector(selectEventPreview);

    const prevEventIdRef = useRef<string | null>(null);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof ConSysApi[]>>(new Map<string, typeof ConSysApi[]>());
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const currentUser = useSelector(selectCurrentUser);

    // Chart Specifics
    const [gammaDatasources, setGammaDS] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDS] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDS] = useState<typeof ConSysApi[]>([]);

    // Adjudication Specifics
    const [adjFormData, setAdjFormData] = useState<IAdjudicationData | null>();
    const [notes, setNotes] = useState<string>("");
    const [adjudicationCode, setAdjudicationCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [adjudication, setAdjudication] = useState<AdjudicationData | null>();

    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);
    const [colorStatus, setColorStatus] = useState('')

    let latestGB = useSelector((state: RootState) => selectLatestGB(state));

    const handleAdjudicationCode = (value: AdjudicationCode) => {
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
            alarmingSystemUid: eventPreview.eventData.rpmSystemId
        }

        let adjudicationData = new AdjudicationData(new Date().toISOString(), currentUser, eventPreview.eventData.occupancyId, eventPreview.eventData.rpmSystemId);

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
        const phenomenonTime = new Date().toISOString();
        const comboData = adjudication;

        comboData.setFeedback(notes);
        comboData.setTime(phenomenonTime);

        let observation = comboData.createAdjudicationObservation();

        // send to server
        const currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        const endpoint = currLaneEntry.parentNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + adjDsID + "/observations";


        await submitAdjudication(endpoint, observation, currLaneEntry, comboData, eventPreview)
    }

    const submitAdjudication = async(endpoint: string, observation: any, currLaneEntry: LaneMapEntry, comboData: any, eventPreview: any) =>{
        try {
            const resp = await insertObservation(endpoint, observation);

            if(resp.ok){
                setAdjSnackMsg('Adjudication Submitted Successfully')
                setColorStatus('success')

            }else{
                setAdjSnackMsg('Adjudication Submission Failed. Check connection and form then try again.')
                setColorStatus('error')
            }

            // send command
            // we can use endTime as it is the same a resultTime in testing, this may not be true in practice but this is a stop-gap fix anyway
            let ds = currLaneEntry.datastreams.find((ds: any) => ds.properties.id == eventPreview.eventData.dataStreamId );
            let occupancyObservation = await fetchOccupancyObservation(ds, eventPreview.eventData.startTime, eventPreview.eventData.endTime)


            if (!occupancyObservation) {
                setAdjSnackMsg('Cannot find observation to adjudicate. Please try again.');
                setColorStatus('error')
                setOpenSnack(true);
                return;
            }

            await sendSetAdjudicatedCommand(currLaneEntry.parentNode, currLaneEntry.controlStreams[0].properties.id, generateCommandJSON(occupancyObservation[0].id, true));
            dispatch(updateSelectedEventAdjudication(comboData));

        } catch (error) {
            setAdjSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        }finally{
            setOpenSnack(true)
            resetAdjudicationData();
            handleCloseRounded();
        }
    }

    const resetAdjudicationData = () => {
        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);
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
    }

    const handleExpand = () => {
        dispatch(setEventData(eventPreview.eventData));
        dispatch(setSelectedRowId(eventPreview.eventData.id))
        dispatch(setSelectedEvent(eventPreview.eventData));

        router.push("/event-details");
    }

    function disconnectDSArray(dsArray: typeof ConSysApi[]) {
        dsArray.forEach(ds => {
            ds.disconnect();
        });
    }

    const cleanupResources = () => {
        disconnectDSArray(gammaDatasources);
        disconnectDSArray(neutronDatasources);
        disconnectDSArray(thresholdDatasources);

        setDatasourcesReady(false);
    };

    useEffect(() => {
        if (eventPreview.eventData?.occupancyId !== prevEventIdRef.current) {

            if (prevEventIdRef.current) {
                cleanupResources();
            }

            prevEventIdRef.current = eventPreview.eventData?.occupancyId;

            if (eventPreview.eventData?.laneId && laneMapRef.current) {
                callCollectDataSources();
                dispatch(setEventData(eventPreview.eventData));
            }
        }

    }, [eventPreview.eventData?.occupancyId]);

    const collectDataSources = useCallback(async() => {
        if (!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        let tempDSMap = new Map<string, typeof ConSysApi[]>();

        let datasources = await currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);

        setLocalDSMap(datasources);
        tempDSMap = datasources;

        const updatedGamma = tempDSMap.get("gamma") || [];
        const updatedNeutron = tempDSMap.get("neutron") || [];
        const updatedThreshold = tempDSMap.get("gammaTrshld") || [];

        setGammaDS(updatedGamma);
        setNeutronDS(updatedNeutron);
        setThresholdDS(updatedThreshold);

        setDatasourcesReady(true);
    }, [eventPreview, laneMapRef]);


    async function callCollectDataSources(){
        await collectDataSources();
    }

    useEffect( () => {
        gammaDatasources.forEach(ds => ds.connect());
        neutronDatasources.forEach(ds => ds.connect());
        thresholdDatasources.forEach(ds => ds.connect());

    }, [datasourcesReady]);



    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenSnack(false);
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
                        Occupancy ID: {eventPreview.eventData.occupancyId}
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
                        <ChartTimeHighlight
                            datasources={{
                                gamma: gammaDatasources[0],
                                neutron: neutronDatasources[0],
                                threshold: thresholdDatasources[0]
                            }}
                            modeType="preview"
                            eventData={eventPreview.eventData}
                            latestGB={latestGB}
                        />


                        <video autoPlay controls height="320" width="100%">
                            {eventPreview?.eventData?.videoFiles?.map((video, index) => (
                                <source key={index} src={video.trim()} type="video/mp4" />
                            ))}
                            Your browser does not support the video tag.
                        </video>
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
                        autoHideDuration={5000}
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