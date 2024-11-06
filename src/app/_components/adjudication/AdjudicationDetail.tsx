/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    InputBase,
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
    findObservationIdBySamplingTime,
    generateCommandJSON,
    IAdjudicationData,
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

export default function AdjudicationDetail(props: { event: EventTableData }) {

    const defaultAdjData: IAdjudicationData = {
        time: "",
        id: "",
        username: "",
        feedback: "",
        adjudicationCode: AdjudicationCodes.getCodeObjByIndex(0),
        isotopes: "",
        secondaryInspectionStatus: "NONE",
        filePaths: "",
        occupancyId: "",
        alarmingSystemUid: "",
        vehicleId: ""
    }

    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);

    const [adjudicationCode, setAdjCode] = useState(AdjudicationCodes.codes[0]);
    const [isotope, setIsotope] = useState<string[]>([]);
    const [secondaryInspection, setSecondaryInspection] = useState('');

    const [vehicleId, setVehicleId] = useState<string>("");
    const [feedback, setFeedback] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const currentUser = useSelector(selectCurrentUser);
    const [associatedAdjudications, setAssociatedAdjudications] = useState<Comment[]>([]);
    const [shouldFetchLogs, setShouldFetchLogs] = useState<boolean>(false);
    const adjudication = props.event ? new AdjudicationData(currentUser, props.event.occupancyId, props.event.systemIdx) : null;
    const [adjData, setAdjData] = useState<AdjudicationData>(adjudication);

    const dispatch = useDispatch();

    //snackbar
    const [adjSnackMsg, setAdjSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);

    /**handle the file uploaded**/
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files === null) {
            console.log('file is null')
            return;
        }
        const files = Array.from(e.target.files);
        setUploadedFiles([...uploadedFiles, ...files]);
        e.target.value = "";

    };

    const handleAdjudicationSelect = (value: AdjudicationCode) => {
        console.log(value);
        let tAdjData: AdjudicationData = adjData;
        tAdjData.adjudicationCode = AdjudicationCodes.getCodeObjByLabel(value.label);
        console.log("Updating ADJ code:", tAdjData);
        setAdjData(tAdjData);
        setAdjCode(value);
    }

    const handleIsotopeSelect = (value: string[]) => {
        console.log(value);
        let valueString = value.join(', ');
        let tAdjData = adjData;
        tAdjData.isotopes = valueString;
        // setIsotope(value);
        console.log("[ADJ-D] Isotope: ", valueString);

        setIsotope(value);
        setAdjData(tAdjData);
    }

    const handleInspectionSelect = (value: string) => {
        console.log(value);
        let tAdjData = adjData;

        tAdjData.secondaryInspectionStatus = value;

        console.log("[ADJ-D] Secondary Inspection: ", value);
        setSecondaryInspection(value);

        setAdjData(tAdjData);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, checked} = e.target;

        let tempAdjData = adjData;

        tempAdjData.username = currentUser;

        // if (name === 'secondaryInspection') {
        //     checked ? tempAdjData.secondaryInspectionStatus = "REQUESTED" : tempAdjData.secondaryInspectionStatus = "NONE";
        //     setSecondaryInspection(checked);
        // }
        if (name === 'vehicleId') {
            setVehicleId(value);
            tempAdjData.vehicleId = value;
        } else if (name === 'notes') {
            setFeedback(value)
            tempAdjData.feedback = value;
        }
        // console.log("[ADJ-D] Adj Data: ", tempAdjData);
        setAdjData(tempAdjData);
    }

    function resetForm() {
        console.log("[ADJ-D] Resetting Form");
        setVehicleId('')
        setAdjData(adjudication);
        setUploadedFiles([]);
        setSecondaryInspection('');
        setIsotope([]);
        setAdjCode(AdjudicationCodes.codes[0]);
        setFeedback('')
    }

    const sendAdjudicationData = async () => {
        let phenomenonTime = new Date().toISOString();
        let tempAdjData: AdjudicationData = adjData;
        console.log("Adj Data to send", tempAdjData);
        tempAdjData.setTime(phenomenonTime);
        // let observation = createAdjudicationObservation(comboData, phenomenonTime);
        let observation = tempAdjData.createAdjudicationObservation();
        console.log("[ADJ] Sending Adjudication Data: ", observation);

        // send to server
        let currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        // const adjDSId = props.event.dataStreamId;
        const ep = currLaneEntry.parentNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + adjDsID + "/observations";

        console.log('temp adjudicated dat', tempAdjData)
        try{
            let resp = await fetch(ep, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: observation,
                mode: "cors"
            });
            console.log("[ADJ] Response: ", resp);

            if(resp.ok){
                setAdjSnackMsg('Adjudication Submitted Successfully')
                dispatch(updateSelectedEventAdjudication(tempAdjData))
            }else{
                setAdjSnackMsg('Adjudication Submission Failed. Check connection and form then try again.')
            }
        }catch(error){
            setAdjSnackMsg('Adjudication failed to submit.')
        }

        // send command
        // we can use endTime as it is the same a resultTime in testing, this may not be true in practice but this is a stop-gap fix anyway
        let refObservation = await findObservationIdBySamplingTime(currLaneEntry.parentNode, props.event.dataStreamId, props.event.endTime)
        console.log('refObservation', refObservation)


        // guard, maybe add an appropriate snackbar
        if (!refObservation) return
        await sendSetAdjudicatedCommand(currLaneEntry.parentNode, currLaneEntry.adjControlStreamId,
            generateCommandJSON(refObservation.id, true));
        // dispatch(updateSelectedEventAdjudication(comboData));

        setShouldFetchLogs(true);
        setOpenSnack(true);
        resetForm();
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
                {/*<Avatar>OP</Avatar>*/}
                <Box>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            required
                            label="Username"
                            name="username"
                            value={currentUser}
                            onChange={handleChange}
                            disabled
                        />
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
                <AdjudicationSelect adjCode={adjudicationCode} onSelect={handleAdjudicationSelect}/>
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
                                <Box display={"flex"} sx={{wordSpacing: 2}}>
                                    <InsertDriveFileRoundedIcon/>
                                    <Typography variant="body1">{file.name}</Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                )
            }
            <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"}
                   width={"100%"}>
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
                    }}>
                    Upload Files
                    <InputBase
                        disabled
                        type="file"
                        inputProps={{multiple: true}}
                        onChange={handleFileUpload}
                        inputRef={fileInputRef}
                        sx={{display: "none"}}
                    />
                </Button>
                <Stack direction={"row"} spacing={2}>
                    <SecondaryInspectionSelect secondarySelectVal={secondaryInspection} onSelect={handleInspectionSelect}/>
                    {/*<FormControlLabel control={<Checkbox name="secondaryInspection" checked={secondaryInspection}*/}
                    {/*                                     onChange={handleChange}/>} label="Secondary Inspection"/>*/}
                    <Button disableElevation variant={"contained"} color={"success"}
                            onClick={sendAdjudicationData}>Submit</Button>
                    <Snackbar
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        open={openSnack}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={adjSnackMsg}
                    />
                </Stack>

            </Stack>
        </Stack>
    );
}
