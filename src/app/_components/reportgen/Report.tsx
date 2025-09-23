import {
    Alert,
    Button,
    FormControl,
    Grid, InputLabel,
    MenuItem,
    Paper, Select,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    Typography
} from "@mui/material";
import ReportTypeSelect from "@/app/_components/reportgen/ReportTypeSelector";
import {Download} from "@mui/icons-material";
import React, {useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import NationalDatePicker from "@/app/_components/national/NationalDatePicker";
import {INode, insertObservation} from "@/lib/data/osh/Node";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectNodes} from "@/lib/state/OSHSlice";
import NodeSelect from "@/app/_components/reportgen/NodeSelector";


export default function ReportGeneratorView(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>(null);
    const [customStartTime, setCustomStartTime] = useState<Date | null>(null);
    const [customEndTime, setCustomEndTime] = useState<Date | null>(null);
    const [selectedNode, setSelectedNode] = useState(null);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');




    const handleGenerateReport = async() => {
        if (selectedTimeRange === "custom" && (!customStartTime || !customEndTime)){
            setSnackMessage("Please select both custom start and end dates.");
            setSeverity("error");
            setOpenSnack(true)
        }

        if (selectedReportType === "LANE" && !selectedNode){
            setSnackMessage("Please select a node for the Lane Report.");
            setSeverity("error");
            setOpenSnack(true)
        }

        setIsGenerating(true);

        let startTime, endTime = getTimeRange(selectedTimeRange);


        try {
            const response = await insertObservation("endpoint", "observation");

            if (response.ok) {
                setSnackMessage("Report request submitted successfully.");
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

    const handleNodeSelect = (value: string) => {
        setSelectedNode(value)
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
        // setSelectedEventType("");
        setSelectedReportType("")
        setSelectedTimeRange("");
        setCustomEndTime(null);
        setCustomEndTime(null)

    }

    const getTimeRange = (timeRange: string): {startTime: Date, endTime: Date} => {
        const now = new Date();
        let startTime: Date;
        let endTime: Date = now;


        switch(timeRange){
            case "last24Hrs":
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "last7days":
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "last30days":
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "thisMonth":
                startTime = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "custom":
                startTime = customStartTime;
                endTime = customEndTime;
                break;
            default:
                startTime = now;
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
                            reportTypeVal={selectedReportType}
                        />
                    </Grid>

                    {selectedReportType == "LANE" && (
                        <Grid item xs={12} md={6}>
                            <NodeSelect onSelect={handleNodeSelect} node={selectedNode} />
                        </Grid>
                    )}
                </Grid>

            </Paper>
            <Paper sx={{padding: 3}}>
                <Typography variant="h6" gutterBottom>Time Range</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TimeRangeSelect onSelect={handleTimeRange} timeRangeVal={selectedTimeRange}/>
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