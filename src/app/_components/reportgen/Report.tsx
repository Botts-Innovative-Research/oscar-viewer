import {
    Alert, Box,
    Button, Card, Grid,
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
import {INode} from "@/lib/data/osh/Node";;
import NodeSelect from "@/app/_components/reportgen/NodeSelector";
import LaneSelect from "@/app/_components/reportgen/LaneSelector";
import {generateCommandJSON, sendReportCommand} from "@/lib/data/oscar/ReportGeneration";
import EventTypeSelect from "@/app/_components/reportgen/EventTypeSelector";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import {isReportControlStream} from "@/lib/data/oscar/Utilities";


export default function ReportGeneratorView(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>("");
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>("");
    const [customStartTime, setCustomStartTime] = useState<string | null>("");
    const [customEndTime, setCustomEndTime] = useState<string | null>("");
    const [selectedNode, setSelectedNode] = useState<INode | null>(null);
    const [selectedLaneUID, setSelectedLaneUID] = useState<string | null>("");
    const [selectedEvent, setSelectedEvent] = useState<string | null>("");
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

    // const [generatedURL, setGeneratedURL] = useState<string | null>(null);
    const [generatedURL, setGeneratedURL] = useState<string | null>("http://localhost:8282/reports/RDS_SITE_2025-09-25T19:57:56.762Z_2025-09-26T19:57:56.762Z.pdf");

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


        try {
            if(!selectedNode) return;

            setIsGenerating(true);
            let streams = await selectedNode.fetchNodeControlStreams();
            console.log("streams", streams);

            let controlstream = streams.find((stream: any) => isReportControlStream(stream))
            console.log("controlstream", controlstream);
            if(!controlstream){
                console.error("no report control streams");
                return;
            }

            let response = await sendReportCommand(selectedNode, controlstream.properties.id, generateCommandJSON(startTime, endTime, selectedReportType, selectedLaneUID, selectedEvent));


            if (!response.ok) {
                setSnackMessage("Report request failed to submit.");
                setSeverity("error");
                return;
            }

            let reportUrl = await response.json();
            setGeneratedURL(selectedNode.isSecure ? `https://${selectedNode.address}:${selectedNode.port}/reports/${reportUrl[0].reportUrl}` : `http://${selectedNode.address}:${selectedNode.port}/reports/${reportUrl[0].reportUrl}`);


            setSnackMessage("Report created successfully");
            setSeverity("success");

        } catch (error) {
            setSnackMessage("Report request failed to submit.");
            setSeverity("error");
        } finally {
            setOpenSnack(true)
            setIsGenerating(false)
            resetForm();
        }
    }


    const handleLaneSelect = (value: any) => {
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

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
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
        setSelectedLaneUID("");
        setCustomEndTime("");
        setCustomStartTime("")
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
                        <ReportTypeSelect onSelect={handleReportTypeSelect} report={selectedReportType} />

                        {selectedReportType == "LANE" && (
                            <LaneSelect onSelect={handleLaneSelect} lane={selectedLaneUID} />
                        )}

                        {selectedReportType == "EVENT" && (
                            <EventTypeSelect onSelect={handleEventTypeSelect} event={selectedEvent} />
                        )}

                        <TimeRangeSelect onSelect={handleTimeRange} timeRange={selectedTimeRange} />

                        {selectedTimeRange === 'custom' && (
                            <NationalDatePicker customStartTime={customStartTime} customEndTime={customEndTime} onCustomStartChange={handleCustomStartTime} onCustomEndChange={handleCustomEndTime}/>
                        )}

                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            startIcon={<Download/>}
                            onClick={handleGenerateReport}
                            disabled={isGenerating || !selectedReportType || !selectedTimeRange}
                        >
                            {isGenerating ? 'Generating Report...' : 'Generate Report'}
                        </Button>
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