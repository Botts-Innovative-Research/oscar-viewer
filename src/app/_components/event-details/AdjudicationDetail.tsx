"use client";

import {
    Avatar,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    InputBase,
    Paper,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import {Comment, SelectedEvent} from "../../../../types/new-types";
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import React, {ChangeEvent, useContext, useRef, useState} from "react";
import AdjudicationSelect from "../event-preview/AdjudicationSelect";
import IsotopeSelect from "./IsotopeSelect";
import AdjudicationLog from "./AdjudicationLog"
import {createAdjudicationObservation, IAdjudicationData} from "@/lib/data/oscar/adjudication/Adjudication";
import {selectCurrentUser, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import {useSelector} from "react-redux";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationContants";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

export default function AdjudicationDetail(props: { event: EventTableData }) {

    const defaultAdjData: IAdjudicationData = {
        time: "",
        id: "",
        username: "",
        feedback: "",
        adjudicationCode: "",
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
    const [secondaryInspection, setSecondaryInspection] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [adjData, setAdjData] = useState<IAdjudicationData>(defaultAdjData);
    const currentUser = useSelector(selectCurrentUser);
    const [associatedAdjudications, setAssociatedAdjudications] = useState<Comment[]>([]);
    const [shouldFetchLogs, setShouldFetchLogs] = useState<boolean>(false);

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
        let tAdjData = {...adjData};
        tAdjData.adjudicationCode = value.label;
        setAdjData(tAdjData);
        setAdjCode(value);
    }

    const handleIsotopeSelect = (value: string[]) => {
        console.log(value);
        let valueString = value.join(', ');
        let tAdjData = {...adjData};
        tAdjData.isotopes = valueString;
        // setIsotope(value);
        console.log("[ADJ-D] Isotope: ", valueString);

        setIsotope(value);
        setAdjData(tAdjData);
    }

    const handleSubmit = () => {
        //require user before allowing submission
        // const newComment: Comment = {
        //     user: user,
        //     vehicleId: vehicleId,
        //     notes: notes,
        //     files: uploadedFiles,
        //     secondaryInspection: secondaryInspection,
        //     adjudication: adjudicated,
        //     isotope: isotope
        // }
        // setComments([...comments, newComment]);
        // console.log(newComment)

        // setUser("");
        // setVehicleId("");
        // setNotes("");
        // setUploadedFiles([]);
        // setAdjudicated("");
        // setIsotope([]);
        // setSecondaryInspection(false);
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, checked} = e.target;

        let tempAdjData = {...adjData};
        if (name === 'secondaryInspection') {
            checked ? tempAdjData.secondaryInspectionStatus = "REQUESTED" : tempAdjData.secondaryInspectionStatus = "NONE";
            setSecondaryInspection(checked);
        } else if (name === 'vehicleId') {
            // setVehicleId(value);
            tempAdjData.id = value;
        } else if (name === 'notes') {
            // setNotes(value)
            tempAdjData.feedback = value;
        }
        console.log("[ADJ-D] Adj Data: ", tempAdjData);
        setAdjData(tempAdjData);
    }

    function resetForm() {
        console.log("[ADJ-D] Resetting Form");
        setAdjData(defaultAdjData);
        setUploadedFiles([]);
        setSecondaryInspection(false);
        setIsotope([]);
        setAdjCode(AdjudicationCodes.codes[0]);
    }

    const sendAdjudicationData = async () => {
        let phenomenonTime = new Date().toISOString();
        let comboData = adjData;
        // comboData.feedback = notes;
        comboData.time = phenomenonTime;
        let observation = createAdjudicationObservation(comboData, phenomenonTime);
        console.log("[ADJ] Sending Adjudication Data: ", observation);
        // send to server
        let currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        const adjDsID = currLaneEntry.parentNode.laneAdjMap.get(currentLane);
        const ep = currLaneEntry.parentNode.getConnectedSystemsEndpoint() + "/datastreams/" + adjDsID + "/observations";
        let resp = await fetch(ep, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: observation,
            mode: "cors"
        });
        console.log("[ADJ] Response: ", resp);

        setShouldFetchLogs(true);
        resetForm();
    }

    function onFetchComplete() {
        setShouldFetchLogs(false);
    }


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
                            value={adjData.id}
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
                value={adjData.feedback}
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
                    <FormControlLabel control={<Checkbox name="secondaryInspection" checked={secondaryInspection}
                                                         onChange={handleChange}/>} label="Secondary Inspection"/>
                    <Button disableElevation variant={"contained"} color={"success"}
                            onClick={sendAdjudicationData}>Submit</Button>
                </Stack>

            </Stack>
        </Stack>
    )
        ;
}