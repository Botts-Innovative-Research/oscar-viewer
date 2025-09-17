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
import React, {useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import NationalDatePicker from "@/app/_components/national/NationalDatePicker";
import ReportGenerationData, {sendSetReportCommand} from "@/lib/data/oscar/report/ReportGeneration";
import {insertObservation} from "@/lib/data/osh/Node";

//TODO: add a node dropdown and then whichever node they choose send the request to that endpoint

export default function ReportGeneratorView(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>(null);
    const [selectedEventType, setSelectedEventType]= useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>(null);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

    const [customDates, setCustomDates] = useState();

    const [reportData, setReportData] = useState<ReportGenerationData>();

    const handleGenerateReport = async() => {
        setIsGenerating(true);

        let tempData: ReportGenerationData = reportData;

        let observation = tempData.createReportObservation();

        await submitReport("", "");

    }

    const handleTimeRange = (value: string) => {
        setSelectedTimeRange(value)
    }

    const handleReportTypeSelect = (value: string) => {
        setSelectedReportType(value);
    }

    const handleEventTypeSelect = (value: string) => {
        setSelectedEventType(value);
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };

    const resetForm = () => {
        setIsGenerating(false);
        setSelectedEventType("");
        setSelectedTimeRange("");
        setSelectedEventType("");
        // setCustomDates();
    }


    const submitReport = async(endpoint: string, observation: any) => {
        try {
            const response = await insertObservation(endpoint, observation);

            if (response.ok) {
                setSnackMessage("Report request submitted successfully.");
                setSeverity("success");
            }

            await sendSetReportCommand(null, null, null);

        } catch (error) {
            setSnackMessage("Report request failed to submit.");
            setSeverity("error");
        } finally {
            setOpenSnack(true)
            setIsGenerating(false)
            resetForm();
        }

    }

        return (
            <Stack p={3} spacing={3}>
                <Typography
                    variant="h4"
                    sx={{padding: 2}}
                >
                    Report Generator
                </Typography>

                <Paper sx={{padding: 3}}>
                    <Grid container spacing={2}>

                        <Grid item xs={12} md={6}>
                            <ReportTypeSelect
                                onSelect={handleReportTypeSelect}
                                reportTypeVal={selectedReportType}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TimeRangeSelect onSelect={handleTimeRange} timeRangeVal={selectedTimeRange}/>
                        </Grid>

                        {selectedTimeRange === 'custom' && (
                            <Grid item xs={12} md={6}>
                                <NationalDatePicker/>

                            </Grid>
                        )}

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