import {
    Alert,
    Button,
    Card,
    CardContent,
    Grid,
    Paper,
    Snackbar,
    SnackbarCloseReason,
    Stack,
    Typography
} from "@mui/material";
import ReportTypeSelect, {reportTypes} from "@/app/_components/reportgen/ReportTypeSelector";
import {Download} from "@mui/icons-material";
import React, {useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import {DateTimePicker} from "@mui/x-date-pickers";
import NationalDatePicker from "@/app/_components/national/NationalDatePicker";



export default function ReportGenerator(){
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>(null);
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>(null);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [snackColorStatus, setSnackColorStatus] = useState("");


    const handleGenerateReport = () => {

        // do stuff
        setSnackMessage("Successfully generated report!");
        setSnackColorStatus("success");
        setOpenSnack(true)
    }

    const handleTimeRange = (value: string) => {
        setSelectedTimeRange(value)
    }

    const handleReportTypeSelect = (value: string) => {
        setSelectedReportType(value);
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };

    return(
        <Stack p={3} spacing={3}>
            <Typography
                variant="h4"
                sx={{ padding: 2 }}
            >
                Report Generator
            </Typography>

            <Paper sx={{ padding: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <ReportTypeSelect onSelect={handleReportTypeSelect} reportTypeVal={selectedReportType} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TimeRangeSelect onSelect={handleTimeRange} timeRangeVal={selectedTimeRange} />
                        {
                            selectedTimeRange === 'custom' ? <NationalDatePicker /> : null
                        }
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            startIcon={<Download />}
                            onClick={handleGenerateReport}
                            disabled={isGenerating || !selectedReportType}
                        >
                            { isGenerating ? 'Generating Report...' : 'Generate Report'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
            <Snackbar
                open={openSnack}
                autoHideDuration={5000}
                onClose={handleCloseSnack}
                anchorOrigin={{ vertical:'top', horizontal:'center' }}
            >
                <Alert severity="success" onClose={handleCloseSnack}>
                    {snackMessage}
                </Alert>
            </Snackbar>

        </Stack>
    )
}