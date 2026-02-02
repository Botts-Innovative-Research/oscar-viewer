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
    TextField, FormControlLabel, Checkbox, DialogTitle,
    Dialog

} from "@mui/material";
import React, {ChangeEvent, useCallback, useContext, useEffect, useRef, useState} from "react";
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
import {INode} from "@/lib/data/osh/Node";
import {QrCode} from "@mui/icons-material";
import QrScanner from "qr-scanner";
import {CloseIcon} from "next/dist/client/components/react-dev-overlay/internal/icons/CloseIcon";
import DetectorResponseFunction from "./DetectorResponseFunction";
import SpectrumTypeSelector from "@/app/_components/adjudication/SpectrumTypeSelector";

interface FileWithWebId {
    file: File;
    webIdEnabled: boolean;
    detectorResponseFunction: string;
    spectrumType: string;
}

export default function AdjudicationDetail(props: { event: EventTableData }) {
    const dispatch = useAppDispatch();

    const [uploadedFiles, setUploadedFiles] = useState<FileWithWebId[]>([])
    const [adjudicationCode, setAdjudicationCode] = useState(AdjudicationCodes.codes[0]);
    const [isotope, setIsotope] = useState<string[]>([]);
    const [secondaryInspection, setSecondaryInspection] = useState('');

    const [vehicleId, setVehicleId] = useState<string>("");
    const [feedback, setFeedback] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [openDialog, setOpenDialog] = useState(false);
    const videoElement = useRef<HTMLVideoElement>(null);
    const [scannedData, setScannedData] = useState<string[]>([]);
    const scanner = useRef<QrScanner>();

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

    const handleWebIdAnalysis = (fileIndex: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setUploadedFiles(prevFiles =>
            prevFiles.map((fileData, idx) =>
                idx === fileIndex ? { ...fileData, webIdEnabled: event.target.checked } : fileData
            )
        );
    };

    const handleCloseQrCodeDialog = () => {
        scanner?.current?.stop();
        scanner.current = undefined;
        setOpenDialog(false);
    }

    const handleQrCode = () => {
        setOpenDialog(true);
    };

    useEffect(() => {
        if (openDialog && videoElement?.current && !scanner.current) {
            const qrOptions = {
                onDecodeError: (err: any) => console.error("QR Scan Error:", err),
                preferredCamera: "environment",
                highlightScanRegion: true,
            }

            scanner.current = new QrScanner(videoElement.current, (result) => {

                setScannedData(prev => {
                    if (prev.includes(result.data))
                        return prev;
                    return [...prev, result.data]
                });
                }, qrOptions);

            scanner?.current?.start().catch((err) => {
                console.error("Error starting scanner")
                setAdjSnackMsg("Failed to start camera");
                setOpenSnack(true);
            });

        }
    }, [openDialog]);


    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files === null) {
            return;
        }

        const files = Array.from(e.target.files);

        const filesWithWebId = files.map(file => ({
            file,
            webIdEnabled: false,
            detectorResponseFunction: "",
            spectrumType: ""
        }));

        setUploadedFiles([...uploadedFiles, ...filesWithWebId]);
        e.target.value = '';
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
        let tAdjData = adjData;
        tAdjData.isotopes = value;
        setIsotope(value);
        setAdjData(tAdjData);
    }

    const handleInspectionSelect = (value: string) => {
        let tAdjData = adjData;
        tAdjData.secondaryInspectionStatus = value;
        setSecondaryInspection(value);
        setAdjData(tAdjData);
    }

    const handleDrfSelection = (fileIndex: number) => (value: string) => {
        setUploadedFiles(prevFiles =>
            prevFiles.map((fileData, idx) =>
                idx === fileIndex ? { ...fileData, detectorResponseFunction: value } : fileData
            )
        );
    }

    const handleSpectrumType = (fileIndex: number) => (value: string) => {
        setUploadedFiles(prevFiles =>
            prevFiles.map((fileData, idx) =>
                idx === fileIndex ? { ...fileData, spectrumType: value } : fileData
            )
        );
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
        tempAdjData.setFilePaths(uploadedFiles.map(f => f.file.name));
        tempAdjData.setAdjudicationCode(adjData.adjudicationCode);
        tempAdjData.setVehicleId(adjData.vehicleId);
        tempAdjData.setFeedback(adjData.feedback);
        tempAdjData.setIsotopes(adjData.isotopes);
        tempAdjData.setOccupancyObsId(adjData.occupancyObsId);

        // send to server
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        await submitAdjudication(currLaneEntry, tempAdjData, uploadedFiles)
    }

    const submitAdjudication = async(currLaneEntry: any, tempAdjData: any, files: FileWithWebId[]) => {
        try {
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
                    files.map(file => 'adjudication/' + file.file.name),
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

            const responseJson = await response.json()
            if (responseJson) {
                const adjId = responseJson['command@id'];

                await sendFileUploadRequest(files, currLaneEntry.parentNode, adjId);

                await sendQrCodeUploadRequest(scannedData, currLaneEntry.parentNode, adjId)
            }
        } catch(error) {
            setAdjSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        } finally {
            setShouldFetchLogs(true);
            setOpenSnack(true);
            resetForm();
        }
    }

    async function sendQrCodeUploadRequest(qrDataArray: string[], node: INode, adjId: string) {
        const encoded = btoa(`${node.auth.username}:${node.auth.password}`);
        const protocol = node.isSecure ? 'https://' : 'http://';

        const endpoint = `${protocol}${node.address}:${node.port}${node.oshPathRoot}/buckets/adjudication?adjudicationId=${adjId}`
        const url = new URL(endpoint);

        for (const qrData of qrDataArray) {
            const options: RequestInit = {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${encoded}`,
                    'Content-Type': 'text/plain'
                },
                mode: 'cors',
                body: qrData
            }
            const response = await fetch(url, options);

            if (!response.ok) {
                console.error("Successfully uploaded data from qr code:", response);
                setAdjSnackMsg(`Successfully uploaded data from qr code`);
                setColorStatus('success');
                setOpenSnack(true);
                return;
            }

            setAdjSnackMsg(`Failed to upload data from qr code`);
            setColorStatus('error');
            setOpenSnack(true);
        }
    }

    async function sendFileUploadRequest(filePaths: FileWithWebId[], node: INode, adjId: string) {
        const encoded = btoa(`${node.auth.username}:${node.auth.password}`);
        const protocol = node.isSecure ? 'https://' : 'http://';

        const webIdFiles = filePaths.filter(f => f.webIdEnabled);
        const foregroundFile = webIdFiles.find(f => f.spectrumType === 'FOREGROUND');
        const backgroundFile = webIdFiles.find(f => f.spectrumType === 'BACKGROUND');
        const hasPair = foregroundFile && backgroundFile;

        // Track which files are sent as a pair so we skip them in the individual loop
        const pairedFiles = hasPair ? new Set([foregroundFile, backgroundFile]) : new Set<FileWithWebId>();

        // Send foreground + background together in one request
        if (hasPair) {
            const drf = foregroundFile.detectorResponseFunction || backgroundFile.detectorResponseFunction;
            const endpoint = `${protocol}${node.address}:${node.port}${node.oshPathRoot}${node.bucketsEndpoint}/adjudication?adjudicationId=${adjId}&enableWebId=true&drf=${drf}&foreground=${foregroundFile.file.name}&background=${backgroundFile.file.name}`;
            const url = new URL(endpoint);

            const formData = new FormData();
            formData.append('foreground', foregroundFile.file);
            formData.append('background', backgroundFile.file);

            const options: RequestInit = {
                method: 'PUT',
                headers: { 'Authorization': `Basic ${encoded}` },
                mode: 'cors',
                body: formData
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                console.error("Failed uploading paired WebID files:", response);
                setAdjSnackMsg('Failed to upload paired WebID files.');
                setColorStatus('error');
                setOpenSnack(true);
            }
        }

        // Send remaining files individually
        for (const fileData of filePaths) {
            if (pairedFiles.has(fileData)) continue;

            const endpoint = `${protocol}${node.address}:${node.port}${node.oshPathRoot}${node.bucketsEndpoint}/adjudication/${fileData.file.name}?adjudicationId=${adjId}&enableWebId=${fileData.webIdEnabled}&drf=${fileData.detectorResponseFunction}`;
            const url = new URL(endpoint);

            const formData = new FormData();
            formData.append('file', fileData.file);

            const options: RequestInit = {
                method: 'PUT',
                headers: { 'Authorization': `Basic ${encoded}` },
                mode: 'cors',
                body: formData
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                console.error("Failed uploading file:", fileData.file.name, response);
                setAdjSnackMsg(`Failed to upload file: ${fileData.file.name}`);
                setColorStatus('error');
                setOpenSnack(true);
            }
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
                node={laneMapRef.current.get(props.event.laneId)?.parentNode}
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
                {uploadedFiles.length > 0 && (
                    <Box sx={{ width: "100%" }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Uploaded Files ({uploadedFiles.length})
                        </Typography>
                        <Box
                            sx={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                            }}
                        >
                            {uploadedFiles.map((fileData, index) => (
                                <Box
                                    key={`${fileData.file.name}-${index}`}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: 2,
                                        py: 1,
                                        borderBottom: index < uploadedFiles.length - 1 ? '1px solid' : 'none',
                                        borderColor: 'divider',
                                    }}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center" flex={1} minWidth={0}>
                                        <InsertDriveFileRoundedIcon fontSize="small" color="action" />
                                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                            {fileData.file.name}
                                        </Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={fileData.webIdEnabled}
                                                    onChange={handleWebIdAnalysis(index)}
                                                />
                                            }
                                            label={<Typography variant="body2">WebID</Typography>}
                                            sx={{ mr: 0 }}
                                        />
                                        {
                                            fileData.webIdEnabled ? (
                                                    <Stack direction={"row"} spacing={2}>
                                                        <DetectorResponseFunction onSelect={handleDrfSelection(index)} selectVal={fileData.detectorResponseFunction} />

                                                        <SpectrumTypeSelector onSelect={handleSpectrumType(index)} selectVal={fileData.spectrumType} />
                                                    </Stack>

                                            ) :
                                                (
                                                    <div></div>
                                                )
                                        }
                                        <IconButton
                                            size="small"
                                            onClick={() => handleFileDelete(index)}
                                            color="error"
                                        >
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
                <Stack direction={"row"} spacing={2} justifyContent={"space-between"} alignItems={"center"} width={"100%"}>
                    <Stack direction={"row"} spacing={2}>
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

                        <Button
                            component="label"
                            startIcon={<QrCode/>}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                width: "auto",
                                padding: "8px",
                                borderStyle: "solid",
                                borderWidth: "1px",
                                borderRadius: "10px",
                                borderColor: "info.main",
                                backgroundColor: "inherit",
                                color: "info.main"
                            }}
                            onClick={handleQrCode}
                        >
                             Scan QR Code
                        </Button>

                        <Dialog
                            onClose={handleCloseQrCodeDialog}
                            open={openDialog}
                            fullWidth
                            maxWidth="sm"
                        >
                            <IconButton
                                aria-label="close"
                                onClick={handleCloseQrCodeDialog}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: 8,
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                            <DialogTitle sx={{ textAlign: 'center', pb: 1}}>
                                Spectroscopic QR Code Scanner
                            </DialogTitle>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    p: 3,
                                    pt: 1,
                                }}
                            >
                                <Box className='qr-reader'
                                     sx={{
                                         width: 400,
                                         height: 400,
                                         maxWidth: 400,
                                         borderRadius: 2,
                                         overflow: 'hidden',
                                         backgroundColor: 'black',
                                         display: 'flex',
                                         alignItems: 'center',
                                         justifyContent: 'center',
                                     }}
                                >
                                    <video
                                        ref={videoElement}
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover"
                                    }}
                                    />
                                </Box>

                                {scannedData.length > 0 && (
                                    <Paper
                                        variant="outlined"
                                        sx={{ mt: 2, p: 2, width: '100%', maxHeight: 150, overflowY: 'auto' }}
                                    >
                                        <Typography variant="subtitle2" gutterBottom>
                                            Scanned Codes ({scannedData.length}):
                                        </Typography>
                                        <Stack spacing={1}>
                                            {scannedData.map((data, idx) => (
                                                <Stack
                                                    key={idx}
                                                    direction="row"
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                >
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                        {data}
                                                    </Typography>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setScannedData(prev => prev.filter((_, i) => i !== idx))}
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </Stack>
                                            ))}
                                        </Stack>
                                    </Paper>
                                )}

                                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                    {scannedData.length > 0 && (
                                        <Button
                                            variant="outlined"
                                            onClick={() => setScannedData([])}
                                        >
                                            Clear All
                                        </Button>
                                    )}
                                    <Button
                                        variant="contained"
                                        onClick={handleCloseQrCodeDialog}
                                        sx={{ minWidth: 120 }}
                                    >
                                        Done Scanning
                                    </Button>
                                </Stack>
                            </Box>
                        </Dialog>
                    </Stack>
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