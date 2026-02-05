import {
    Alert, Box,
    Button, CircularProgress, Grid,
    Snackbar,
    SnackbarCloseReason, Paper,
    Stack,
    Typography
} from "@mui/material";
import ReportTypeSelect from "@/app/_components/reportgen/ReportTypeSelector";
import {Download} from "@mui/icons-material";
import React, {useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import NationalDatePicker from "@/app/_components/national/NationalDatePicker";
import {INode} from "@/lib/data/osh/Node";
import NodeSelect from "@/app/_components/reportgen/NodeSelector";
import LaneSelect from "@/app/_components/reportgen/LaneSelector";
import {generateReportCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import EventTypeSelect from "@/app/_components/reportgen/EventTypeSelector";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import {isReportControlStream} from "@/lib/data/oscar/Utilities";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";


export default function ReportGeneratorView(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>("");
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>("");
    const [customStartTime, setCustomStartTime] = useState<string | null>("");
    const [customEndTime, setCustomEndTime] = useState<string | null>("");
    const [selectedNode, setSelectedNode] = useState<INode | null>(null);
    const [selectedLaneUID, setSelectedLaneUID] = useState<string[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');
    const [generatedURL, setGeneratedURL] = useState<string | null>("");
    const [commandStatus, setCommandStatus] = useState<string | null>(null);

    const handleGenerateReport = async() => {
        if (selectedTimeRange === "custom" && (!customStartTime || !customEndTime)){
            setSnackMessage("Please select both custom start and end dates.");
            setSeverity("error");
            setOpenSnack(true)
        }

        if (selectedReportType === "LANE" && !selectedLaneUID){
            setSnackMessage("Please select a lane for the Lane Report.");
            setSeverity("error");
            setOpenSnack(true)
        }

        let startTime = getTimeRange(selectedTimeRange).startTime;
        let endTime = getTimeRange(selectedTimeRange).endTime;


        let isStreamingStatus = false;

        try {
            if(!selectedNode) return;

            setIsGenerating(true);

            let streams: typeof ControlStream[];
            if (selectedNode.oscarServiceSystem != null) {
                const query = await selectedNode.oscarServiceSystem.searchControlStreams(new ControlStreamFilter({ validTime: "latest" }), 100);

                const results = await query.nextPage();
                if (results || results.length > 0) {
                    streams = results;
                }
            } else {
                streams = await selectedNode.fetchNodeControlStreams();
            }

            let controlStream = streams.find((stream: typeof ControlStream) => isReportControlStream(stream))
            if (!controlStream){
                console.error("no report control streams");
                return;
            }

            const response = await sendCommand(
                selectedNode,
                controlStream.properties.id,
                generateReportCommandJSON(startTime, endTime, selectedReportType, selectedLaneUID.toString(), selectedEvent)
            );

            if (response.status == 200) {
                const json = await response.json();

                if (json.statusCode === 'PENDING') {
                    console.log("status pending")
                    const commandId = json['command@id'];
                    isStreamingStatus = true;
                    setCommandStatus('PENDING');

                    const statusEndpoint = `${selectedNode.getConnectedSystemsEndpoint(false)}/controlstreams/${controlStream.properties.id}/commands/${commandId}/status`;

                    const pollInterval = setInterval(async () => {
                        try {
                            const statusResponse = await fetch(statusEndpoint, {
                                headers: selectedNode.getBasicAuthHeader(),
                                mode: 'cors',
                            });

                            if (statusResponse.ok) {
                                const statusData = await statusResponse.json();
                                console.log("status response:", statusData);

                                const items = statusData?.items ?? [statusData];
                                for (const item of items) {
                                    const statusCode = item.statusCode;

                                    if (statusCode === 'ACCEPTED') {
                                        clearInterval(pollInterval);
                                        const reportPath = item?.results?.[0]?.data?.reportPath;
                                        if (reportPath) {
                                            const isTls = selectedNode.isSecure ? 'https://' : 'http://';
                                            setGeneratedURL(
                                                `${isTls}${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${reportPath}`
                                            );
                                        }
                                        setSnackMessage("Report created successfully");
                                        setSeverity("success");
                                        setOpenSnack(true);
                                        setIsGenerating(false);
                                        setCommandStatus(null);
                                        resetForm();
                                        return;
                                    } else if (statusCode === 'FAILED') {
                                        clearInterval(pollInterval);
                                        setSnackMessage("Report generation failed.");
                                        setSeverity("error");
                                        setOpenSnack(true);
                                        setIsGenerating(false);
                                        setCommandStatus(null);
                                        resetForm();
                                        return;
                                    } else if (statusCode) {
                                        setCommandStatus(statusCode);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error("Status poll error:", err);
                        }
                    }, 5000);

                    setSnackMessage("Report is being generated...");
                    setSeverity("success");
                    setOpenSnack(true);
                    return;
                }

                if (json.statusCode === "ACCEPTED") {
                    const isTls = selectedNode.isSecure ? 'https://' : 'http://';
                    setGeneratedURL(
                        `${isTls}${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${json.results[0].data.reportPath}`
                    );
                    setSnackMessage("Report created successfully");
                    setSeverity("success");
                }
            }

            if (!response.ok) {
                setSnackMessage("Report request failed to submit.");
                setSeverity("error");
            }

        } catch (error) {
            setSnackMessage("Report request failed to submit.");
            setSeverity("error");
        } finally {
            setOpenSnack(true);
            if (!isStreamingStatus) {
                setIsGenerating(false);
                resetForm();
            }
        }
    }

    const handleLaneSelect = (value: string[]) => {
        let valueString = value.join(', ');
        setSelectedLaneUID(value)
    }

    const handleEventTypeSelect = (value: any) => {
        setSelectedEvent(value)
    }

    const handleNodeSelect = (value: any) => {
        const node = nodes.find((node: INode) => node.id == value);
        setSelectedNode(node)
    }

    const handleTimeRange = (value: string) => {
        setSelectedTimeRange(value)
    }

    const handleReportTypeSelect = (value: string) => {
        setSelectedReportType(value);
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway')
            return;
        setOpenSnack(false);
    };

    const resetForm = () => {
        setIsGenerating(false);
        setSelectedEvent("");
        setSelectedReportType("")
        setSelectedTimeRange("");
        setSelectedNode(null);
        setSelectedLaneUID([]);
        setCustomEndTime("");
        setCustomStartTime("");
    }

    const getTimeRange = (timeRange: string): {startTime: string, endTime: string} => {
        const now = new Date()
        let startTime: string;
        let endTime: string = now.toISOString();


        switch(timeRange){
            case "last24Hrs":
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                break;
            case "last7days":
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case "last30days":
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case "thisMonth":
                startTime = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                break;
            case "custom":
                startTime = customStartTime;
                endTime = customEndTime;
                break;
            default:
                startTime = now.toISOString();
        }
        return {startTime, endTime};
    }

    const handleCustomStartTime = (value: string) => {
        setCustomStartTime(value)
    }
    const handleCustomEndTime = (value: string) => {
        setCustomEndTime(value)
    }

    return (

        <Box sx={{ padding: 4}} >
            <Grid container spacing={4}>
                <Grid item xs={12} md={5}>
                    <Typography variant="h5" align="center" gutterBottom>
                        Generate A Report
                    </Typography>

                    <Stack spacing={3}>
                        <NodeSelect onSelect={handleNodeSelect} node={selectedNode?.id} />

                        {selectedNode && (
                            <>
                                <ReportTypeSelect onSelect={handleReportTypeSelect} report={selectedReportType} />

                                {["ADJUDICATION", "LANE"].includes(selectedReportType) && (
                                    <LaneSelect onSelect={handleLaneSelect} lane={selectedLaneUID} selectedNode={selectedNode}/>
                                )}

                                {selectedReportType == "EVENT" && (
                                    <EventTypeSelect onSelect={handleEventTypeSelect} event={selectedEvent} />
                                )}

                                <TimeRangeSelect onSelect={handleTimeRange} timeRange={selectedTimeRange} />

                                {selectedTimeRange === 'custom' && (
                                    <NationalDatePicker onCustomStartChange={handleCustomStartTime} onCustomEndChange={handleCustomEndTime}/>
                                )}
                            </>
                        )}


                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            startIcon={<Download/>}
                            onClick={handleGenerateReport}
                            disabled={isGenerating || !selectedReportType || !selectedTimeRange || !selectedNode}
                        >
                            {isGenerating ? 'Generating Report...' : 'Generate Report'}
                        </Button>

                        {commandStatus && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2" color="text.secondary">
                                    Status: {commandStatus}
                                </Typography>
                            </Box>
                        )}

                    </Stack>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper elevation={3} sx={{ padding: 2, height: "100%" }}>
                        <Typography variant="h5" align="center" gutterBottom>
                            Generated Report
                        </Typography>

                        {generatedURL ? (
                            <Box sx={{ height: "800px", border: "1px solid #ccc", borderRadius: 2, overflow: "hidden"}}>
                                <iframe width="100%" height="100%" src={generatedURL} style={{ border: "none"}} />
                            </Box>
                            ) :
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    textAlign: 'center'
                                }}
                            >
                                <Typography variant="body1">
                                    Please generate a report to view and download it here.
                                </Typography>
                            </Box>}
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar
                open={openSnack}
                autoHideDuration={5000}
                onClose={handleCloseSnack}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert severity={severity} onClose={handleCloseSnack}>
                    {snackMessage}
                </Alert>
            </Snackbar>
        </Box>

    )

}