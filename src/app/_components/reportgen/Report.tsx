import {
    Alert,
    Button,
    Grid,
    Paper,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    Typography
} from "@mui/material";
import ReportTypeSelect from "@/app/_components/reportgen/ReportTypeSelector";
import {Download} from "@mui/icons-material";
import React, {useEffect, useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import NationalDatePicker from "@/app/_components/national/NationalDatePicker";
import {INode} from "@/lib/data/osh/Node";;
import NodeSelect from "@/app/_components/reportgen/NodeSelector";
import LaneSelect from "@/app/_components/reportgen/LaneSelector";
import ControlStreams from "osh-js/source/core/consysapi/controlstream/ControlStreams";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isReportControlStream} from "@/lib/data/oscar/Utilities";
import {generateCommandJSON, sendReportCommand} from "@/lib/data/oscar/ReportGeneration";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import EventTypeSelect from "@/app/_components/reportgen/EventTypeSelector";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";


export default function ReportGeneratorView(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>(null);
    const [customStartTime, setCustomStartTime] = useState<string | null>(null);
    const [customEndTime, setCustomEndTime] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<INode | null>(null);
    const [selectedLaneUID, setSelectedLaneUID] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const nodes = useSelector((state: RootState) => selectNodes(state));


    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

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


            console.log("controlStream", controlstream);

            if(!controlstream){
                setSnackMessage("[REPORT] No control stream found");
                setSeverity("error");
                return;
            }
            let payload = generateCommandJSON(startTime, endTime, selectedReportType, selectedLaneUID, null)
            // let response = controlstream.postCommand(payload)

            let response = await sendReportCommand(selectedNode, controlstream.properties.id, payload);

            console.log(response.json)
            if (response.ok) {
                setSnackMessage("Report request submitted successfully. ");
                setSeverity("success");
            }

        } catch (error) {
            setSnackMessage("Report request failed to submit.");
            setSeverity("error");
        } finally {
            setOpenSnack(true)
            setIsGenerating(false)
            resetForm();
        }
    }

    // useEffect(() => {
    //     if (customStartTime && customEndTime) {
    //         setStartDate(customStartTime);
    //         setEndDate(customEndTime);
    //     } else {
    //         setStartDate(null);
    //         setEndDate(null);
    //     }
    // }, [customStartTime, customEndTime]);

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
        setCustomEndTime("")

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


    return (
        <Stack p={3} spacing={3}>
            <Typography variant="h4" sx={{padding: 2}}>
                Generate Reports
            </Typography>

            <Paper sx={{padding: 3}}>
                <Typography variant="h6" gutterBottom>Select Report Type</Typography>
                <Grid container spacing={2}>

                    <Grid item xs={12} md={6}>
                        <ReportTypeSelect
                            onSelect={handleReportTypeSelect}
                            report={selectedReportType}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <NodeSelect onSelect={handleNodeSelect} node={selectedNode?.id} />
                    </Grid>

                    {selectedReportType == "LANE" && (
                        <Grid item xs={12} md={6}>
                            <LaneSelect onSelect={handleLaneSelect} lane={selectedLaneUID} />
                        </Grid>
                    )}
                    {selectedReportType == "EVENT" && (
                        <Grid item xs={12} md={6}>
                            <EventTypeSelect onSelect={handleEventTypeSelect} event={selectedEvent} />
                        </Grid>
                    )}
                </Grid>

            </Paper>
            <Paper sx={{padding: 3}}>
                <Typography variant="h6" gutterBottom>Time Range</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TimeRangeSelect onSelect={handleTimeRange} timeRange={selectedTimeRange}/>
                    </Grid>

                    {selectedTimeRange === 'custom' && (
                        <Grid item xs={12} md={6}>
                            <NationalDatePicker customStartTime={customStartTime} customEndTime={customEndTime}/>
                        </Grid>
                    )}
                </Grid>

            </Paper>
            <Paper sx={{padding: 3}}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
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
                    </Grid>
                </Grid>
            </Paper>
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
        </Stack>
    )

}