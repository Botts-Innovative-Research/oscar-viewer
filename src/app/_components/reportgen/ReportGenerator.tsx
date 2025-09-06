import {Button, Card, CardContent, Grid, Paper, Stack, Typography} from "@mui/material";
import ReportTypeSelect, {reportTypes} from "@/app/_components/reportgen/ReportTypeSelector";
import {Download} from "@mui/icons-material";
import React, {useState} from "react";
import TimeRangeSelect from "@/app/_components/reportgen/TimeRangeSelector";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";



export default function ReportGenerator(){
    const[isGenerating, setIsGenerating] = useState(false);
    const [selectedReportType, setSelectedReportType]= useState<string>(null);
    const [selectedTimeRange, setSelectedTimeRange]= useState(null);

    const handleGenerateReport = () => {
        console.log('generating report!')
    }

    const handleTimeRange = (value: string) => {
        setSelectedTimeRange(value)
    }

    const handleReportTypeSelect = (value: string) => {
        setSelectedReportType(value);
    }

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

            <Card>
                <CardContent>
                    <Typography variant="h6">
                        Available Report Types
                    </Typography>

                    <List dense>
                        {
                            reportTypes.map((type) => (
                                <ListItem key={type.value} alignItems="flex-start" disableGutters>
                                    <ListItemText
                                       primary={ <Typography variant="subtitle2" fontWeight={600}>{type.label}</Typography>}
                                        secondary={ <Typography variant="body2" color="text.secondary">{type.description}</Typography>}
                                    />
                                </ListItem>

                                )
                            )
                        }
                    </List>
                </CardContent>
            </Card>
        </Stack>
    )
}