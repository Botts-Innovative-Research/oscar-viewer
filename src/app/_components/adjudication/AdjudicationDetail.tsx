/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {
    SnackbarCloseReason,
    Stack,
    Typography,
    Box,
    Button,
    Paper,
    Snackbar,
    TextField

} from "@mui/material";
import React, {ChangeEvent, useContext, useEffect, useRef, useState} from "react";
import AdjudicationLog from "./AdjudicationLog"
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import {generateAdjudicationCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import SecondaryInspectionSelect from "./SecondaryInspectionSelect";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import AdjudicationSelect from "./AdjudicationSelect";
import IsotopeSelect from "./IsotopeSelect";
import IconButton from "@mui/material/IconButton";
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import {setAdjudicatedEventId, setSelectedEvent} from "@/lib/state/EventDataSlice";
import {useAppDispatch} from "@/lib/state/Hooks";


export default function AdjudicationDetail(props: { event: EventTableData }) {
    const dispatch = useAppDispatch();

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const [adjudicationCode, setAdjudicationCode] = useState(AdjudicationCodes.codes[0]);
    const [isotope, setIsotope] = useState<string[]>([]);
    const [secondaryInspection, setSecondaryInspection] = useState('');

    const [vehicleId, setVehicleId] = useState<string>("");
    const [feedback, setFeedback] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const adjudication = props.event ? new AdjudicationData(new Date().toISOString(), props.event.occupancyCount, props.event.occupancyObsId, props.event.rpmSystemId) : null;

    const [adjData, setAdjData] = useState<AdjudicationData>(adjudication);

    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [colorStatus, setColorStatus] = useState('');
    const [openSnack, setOpenSnack] = useState(false);

    const [shouldFetchLogs, setShouldFetchLogs] = useState<boolean>(false);

    function onFetchComplete() {
        setShouldFetchLogs(false);
    }

    useEffect(() => {
        const loadOccupancyObservation = async () => {
            if (!props.event.occupancyObsId) {
                try {
                    const currentLane = props.event.laneId;
                    const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

                    if (!currLaneEntry) {
                        console.error("Lane entry not found:", currentLane);
                        return;
                    }

                    const ds = currLaneEntry.datastreams.find(
                        (ds: any) => ds.properties.id === props.event.dataStreamId
                    );

                    if (!ds) {
                        console.error("Datastream not found:", props.event.dataStreamId);
                        return;
                    }

                    const filter = new ObservationFilter({
                        filter: `startTime='${props.event.startTime}' AND endTime='${props.event.endTime}'`
                    });

                    let query = await ds.searchObservations(filter, 10000);
                    const occupancyObservation = await query.nextPage();

                    if (!occupancyObservation || occupancyObservation.length === 0) {
                        setAdjSnackMsg('Cannot find observation to adjudicate. Please try again.');
                        setColorStatus('error');
                        setOpenSnack(true);
                        return;
                    }

                    props.event.occupancyObsId = occupancyObservation[0].id;
                    props.event.rpmSystemId = ds.properties["system@id"];

                } catch (err) {
                    console.error(err);
                    setAdjSnackMsg('Error loading observation.');
                    setColorStatus('error');
                    setOpenSnack(true);
                }
            }
        };

        loadOccupancyObservation();
    }, [
        props.event.occupancyObsId,
        props.event.laneId,
        props.event.startTime,
        props.event.endTime,
        props.event.dataStreamId,
        laneMapRef
    ]);


    /**handle the file uploaded**/
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files === null) {
            return;
        }

        const files = Array.from(e.target.files);
        setUploadedFiles([...uploadedFiles, ...files]);
    };

    const handleFileDelete = (fileIndex: number) => {
        setUploadedFiles((prevState) => prevState.filter((_, i) => i !== fileIndex));
    }

    const handleAdjudicationSelect = (value: AdjudicationCode) => {
        let tAdjData: AdjudicationData = adjData;
        tAdjData.adjudicationCode = AdjudicationCodes.getCodeObjByLabel(value.label);

        setAdjData(tAdjData);
        setAdjudicationCode(value);
    }

    const handleIsotopeSelect = (value: string[]) => {
        let valueString = value.join(', ');
        let tAdjData = adjData;
        tAdjData.isotopes.push(valueString);
        setIsotope(value);
        setAdjData(tAdjData);
    }

    const handleInspectionSelect = (value: string) => {
        let tAdjData = adjData;
        tAdjData.secondaryInspectionStatus = value;
        setSecondaryInspection(value);
        setAdjData(tAdjData);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;

        let tempAdjData = adjData;

        if (name === 'vehicleId') {
            setVehicleId(value);
            tempAdjData.vehicleId = value;
        } else if (name === 'notes') {
            setFeedback(value)
            tempAdjData.feedback = value;
        }

        setAdjData(tempAdjData);
    }

    function resetForm() {
        setVehicleId('')
        setAdjData(adjudication);
        setUploadedFiles([]);
        setSecondaryInspection('');
        setIsotope([]);
        setAdjudicationCode(AdjudicationCodes.codes[0]);
        setFeedback('')
    }

    const sendAdjudicationData = async () => {
        if(adjData.adjudicationCode === null || !adjData.adjudicationCode || adjData.adjudicationCode === AdjudicationCodes.codes[0]){
            setAdjSnackMsg("Please selected a valid adjudication code before submitting.");
            setColorStatus('error');
            setOpenSnack(true)
            return;
        }

        const phenomenonTime = new Date().toISOString();

        let tempAdjData: AdjudicationData = adjData;

        tempAdjData.setTime(phenomenonTime);
        tempAdjData.setFilePaths(adjData.filePaths);
        tempAdjData.setAdjudicationCode(adjData.adjudicationCode);
        tempAdjData.setVehicleId(adjData.vehicleId);
        tempAdjData.setFeedback(adjData.feedback);
        tempAdjData.setIsotopes(adjData.isotopes);
        tempAdjData.setOccupancyObsId(adjData.occupancyObsId);

        // send to server
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        await submitAdjudication(currLaneEntry, tempAdjData)
    }

    const submitAdjudication = async(currLaneEntry: any, tempAdjData: any) => {

        try{

            let ds = currLaneEntry.datastreams.find((ds: any) => ds.properties.id == props.event.dataStreamId);

            let streams = currLaneEntry.controlStreams.length > 0 ? currLaneEntry.controlStreams : await currLaneEntry.parentNode.fetchNodeControlStreams();
            let adjControlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));

            if (!adjControlStream){
                console.error("Failed: cannot find adjudication control stream for occupancy.");
                return;
            }

            if (tempAdjData.occupancyObsId === null) {
                let query = await ds.searchObservations(new ObservationFilter({
                    filter: `startTime='${props.event.startTime}' AND endTime='${props.event.endTime}'`
                }), 1);

                const occupancyObservation = await query.nextPage();

                if (!occupancyObservation) {
                    setAdjSnackMsg('Cannot find observation to adjudicate. Please try again.');
                    setColorStatus('error')
                    setOpenSnack(true);
                    return;
                }

                props.event.occupancyObsId = occupancyObservation[0].id;
                props.event.rpmSystemId = ds.properties["system@id"];
                tempAdjData.occupancyObsId = occupancyObservation[0].id;
                tempAdjData.alarmingSystemUid = ds.properties["system@id"];

            }



            const response = await sendCommand(
                currLaneEntry.parentNode,
                adjControlStream.properties.id,
                generateAdjudicationCommandJSON(
                    tempAdjData.feedback,
                    tempAdjData.adjudicationCode,
                    tempAdjData.isotopes,
                    tempAdjData.secondaryInspectionStatus,
                    tempAdjData.filePaths,
                    tempAdjData.occupancyObsId,
                    tempAdjData.vehicleId
                )
            );

            if (!response.ok) {
                setAdjSnackMsg('Adjudication failed to submit.')
                setColorStatus('error')
                return;
            }

            props.event.adjudicatedData = tempAdjData;

            setAdjSnackMsg('Adjudication successful for Occupancy ID: ' + props.event.occupancyCount);
            setColorStatus('success')

            dispatch(setSelectedEvent(props.event));
            dispatch(setAdjudicatedEventId(props.event.id));

        }catch(error){
            setAdjSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        }finally{
            setShouldFetchLogs(true);
            setOpenSnack(true);
            resetForm();
        }

    }


    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway')
            return;
        setOpenSnack(false);
    };


    return (
        <Stack direction={"column"} p={2} spacing={2}>
            <Typography
                variant="h4"
            >
                Adjudication
            </Typography>

            <AdjudicationLog
                event={props.event}
                shouldFetch={shouldFetchLogs}
                onFetch={onFetchComplete}
            />

            <Stack spacing={2}>
                <Typography variant="h5">Adjudication Report Form</Typography>

                <Stack
                    direction={"row"}
                    spacing={2}
                    justifyContent={"start"}
                    alignItems={"center"}
                >
                    <TextField
                        label="VehicleId"
                        name="vehicleId"
                        value={vehicleId}
                        onChange={handleChange}

                    />
                </Stack>

                <Stack
                    direction={"row"}
                    spacing={2}
                    justifyContent={"start"}
                    alignItems={"center"}
                >
                    <AdjudicationSelect
                        adjCode={adjudicationCode}
                        onSelect={handleAdjudicationSelect}
                    />
                    <IsotopeSelect
                        isotopeValue={isotope}
                        onSelect={handleIsotopeSelect}
                    />
                </Stack>

                <TextField
                    id="outlined-multiline-static"
                    label="Notes"
                    name="notes"
                    multiline
                    rows={4}
                    value={feedback}
                    onChange={handleChange}
                />
                {
                    uploadedFiles.length > 0 && (
                        <Paper variant='outlined' sx={{width: "100%"}}>
                            <Stack
                                sx={{
                                    maxHeight: '100px', // Adjust height based on item size
                                    overflowY: 'auto',
                                    p: 2,
                                }}
                                spacing={1}
                            >
                                {uploadedFiles.map((file, index) => (
                                    <Stack key={`${file}-${index}`} direction="row" spacing={2}>
                                        <Box display={"flex"} sx={{wordSpacing: 2}}>
                                            <InsertDriveFileRoundedIcon/>
                                            <Typography variant="body1">{file.name}</Typography>
                                        </Box>

                                        <IconButton
                                            onClick={() => handleFileDelete(index)}
                                            sx={{
                                                padding: "2px",
                                                border: "1px solid",
                                                borderRadius: "10px",
                                                borderColor: "error.main",
                                                backgroundColor: "inherit",
                                                color: "error.main"
                                            }}>
                                            <DeleteOutline/>
                                        </IconButton>
                                    </Stack>
                                ))}
                            </Stack>
                        </Paper>
                    )
                }
                <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"} width={"100%"}>
                    <Button
                        component="label"
                        startIcon={<UploadFileRoundedIcon/>}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            width: "auto",
                            padding: "8px",
                            borderStyle: "solid",
                            borderWidth: "1px",
                            borderRadius: "10px",
                            borderColor: "secondary.main",
                            backgroundColor: "inherit",
                            color: "secondary.main"
                        }}
                    >
                        Upload Files
                        <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                            style={{display: "none"}}
                        />
                    </Button>
                    <Stack direction={"row"} spacing={2}>
                        <SecondaryInspectionSelect
                            secondarySelectVal={secondaryInspection}
                            onSelect={handleInspectionSelect}
                        />
                        <Button
                            disableElevation
                            variant={"contained"}
                            color={"success"}
                            onClick={sendAdjudicationData}
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
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
}