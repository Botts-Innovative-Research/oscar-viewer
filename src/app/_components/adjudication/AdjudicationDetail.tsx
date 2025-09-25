/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {
    Box,
    Button,
    Paper,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {Comment} from "../../../../types/new-types";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import React, {ChangeEvent, useContext, useRef, useState} from "react";
import IsotopeSelect from "./IsotopeSelect";
import AdjudicationLog from "./AdjudicationLog"
import AdjudicationData, {
    fetchOccupancyObservation,
    generateCommandJSON,
    sendSetAdjudicatedCommand
} from "@/lib/data/oscar/adjudication/Adjudication";
import {selectCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useDispatch, useSelector} from "react-redux";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import {updateSelectedEventAdjudication} from "@/lib/state/EventDataSlice";
import SecondaryInspectionSelect from "@/app/_components/adjudication/SecondaryInspectionSelect";
import {insertObservation} from "@/lib/data/osh/Node";
import DeleteOutline from "@mui/icons-material/DeleteOutline"
import IconButton from "@mui/material/IconButton";

export default function AdjudicationDetail(props: { event: EventTableData }) {

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);

    const [adjudicationCode, setAdjudicationCode] = useState(AdjudicationCodes.codes[0]);
    const [isotope, setIsotope] = useState<string[]>([]);
    const [secondaryInspection, setSecondaryInspection] = useState('');

    const [vehicleId, setVehicleId] = useState<string>("");
    const [feedback, setFeedback] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [shouldFetchLogs, setShouldFetchLogs] = useState<boolean>(false);
    const adjudication = props.event ? new AdjudicationData(null, props.event.occupancyId, props.event.rpmSystemId, new Date().toISOString()) : null;
    const [adjData, setAdjData] = useState<AdjudicationData>(adjudication);

    const dispatch = useDispatch();


    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [colorStatus, setColorStatus] = useState('');
    const [openSnack, setOpenSnack] = useState(false);

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
        tAdjData.isotopes = valueString;
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

        //TODO: first send to file server to the object store send file and wait for response with file paths url,
        // update file paths in adjudication observation body with new urls for files
        // then send command to set adjudicated
        if(adjData.adjudicationCode === null || !adjData.adjudicationCode || adjData.adjudicationCode === AdjudicationCodes.codes[0]){
            setAdjSnackMsg("Please selected a valid adjudication code before submitting.");
            setColorStatus('error');
            setOpenSnack(true)
            return;
        }

        let phenomenonTime = new Date().toISOString();
        let tempAdjData: AdjudicationData = adjData;

        tempAdjData.setTime(phenomenonTime);

        let observation = tempAdjData.createAdjudicationObservation();

        // send to server
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        const endpoint = currLaneEntry.parentNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + adjDsID + "/observations";

        await submitAdjudication(endpoint, observation, currLaneEntry, tempAdjData)
    }


    const submitAdjudication = async(endpoint: string, observation: any, currLaneEntry: any, tempAdjData: any) => {

        try{
            const resp = await insertObservation(endpoint, observation)

            if(resp.ok){
                setAdjSnackMsg('Adjudication Submitted Successfully')
                setColorStatus('success')
                dispatch(updateSelectedEventAdjudication(tempAdjData))
            }else{
                setAdjSnackMsg('Adjudication Submission Failed. Check connection and form then try again.')
                setColorStatus('error')
            }


            let ds = currLaneEntry.datastreams.find((ds: any) => ds.properties.id == props.event.dataStreamId);
            let occupancyObservation = await fetchOccupancyObservation(ds, props.event.startTime, props.event.endTime)

            if (!occupancyObservation) {
                setAdjSnackMsg('Cannot find observation to adjudicate. Please try again.');
                setColorStatus('error')
                setOpenSnack(true);
                return;
            }

            await sendSetAdjudicatedCommand(currLaneEntry.parentNode, currLaneEntry.controlStreams[0].properties.id, generateCommandJSON(occupancyObservation[0].id, true));


        }catch(error){
            setAdjSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        }finally{
            setShouldFetchLogs(true);
            setOpenSnack(true);
            resetForm();
        }

    }

    function onFetchComplete() {
        setShouldFetchLogs(false);
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };

    return (
        <Stack direction={"column"} p={2} spacing={2}>
            <Typography variant="h4">Adjudication</Typography>
            <Box>
                <AdjudicationLog comments={comments} event={props.event} shouldFetch={shouldFetchLogs} onFetch={onFetchComplete}/>
            </Box>

            <Typography variant="h5">Adjudication Report Form</Typography>
            <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
                <Box>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="VehicleId"
                            name="vehicleId"
                            value={vehicleId}
                            onChange={handleChange}

                        />
                    </Stack>
                </Box>
            </Stack>

            <Stack direction={"row"} spacing={2} justifyContent={"start"} alignItems={"center"}>
                <AdjudicationSelect adjCode={adjudicationCode} onSelect={handleAdjudicationSelect} />
                <IsotopeSelect isotopeValue={isotope} onSelect={handleIsotopeSelect}/>
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
                >Upload Files<input type="file" multiple onChange={handleFileUpload} ref={fileInputRef} style={{display: "none"}} /></Button>
                <Stack direction={"row"} spacing={2}>
                    <SecondaryInspectionSelect secondarySelectVal={secondaryInspection} onSelect={handleInspectionSelect} />
                    <Button disableElevation variant={"contained"} color={"success"} onClick={sendAdjudicationData}>
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
    );
}