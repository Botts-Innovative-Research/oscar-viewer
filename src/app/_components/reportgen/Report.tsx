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
import React, {useContext, useEffect, useState} from "react";
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
import Command from "osh-js/source/core/consysapi/command/Command";
import CommandFilter from "osh-js/source/core/consysapi/command/CommandFilter";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {OperationalViewSelect, ReportScopeSelect} from "@/app/_components/reportgen/ReportScopeSelector";
import {
    emptyOperationalViewCatalog,
    OperationalViewCatalog,
} from "@/lib/data/oscar/OperationalView";
import {ReportScope, resolveReportScope} from "@/lib/data/oscar/ReportScope";


export default function ReportGeneratorView(){
    const {t} = useLanguage();
    const {activeViewKey, laneMapReady, viewError} = useContext(DataSourceContext);
    const[isGenerating, setIsGenerating] = useState(false);

    const [selectedReportType, setSelectedReportType]= useState<string | null>("");
    const [selectedTimeRange, setSelectedTimeRange]= useState<string | null>("");
    const [customStartTime, setCustomStartTime] = useState<string | null>("");
    const [customEndTime, setCustomEndTime] = useState<string | null>("");
    const [selectedNode, setSelectedNode] = useState<INode | null>(null);
    const [selectedLaneUID, setSelectedLaneUID] = useState<string[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [selectedScope, setSelectedScope] = useState<ReportScope>(activeViewKey ? "OPERATIONAL_VIEW" : "NODE");
    const [selectedOperationalView, setSelectedOperationalView] = useState(activeViewKey ?? "");
    const [operationalViewCatalog, setOperationalViewCatalog] = useState<OperationalViewCatalog>(emptyOperationalViewCatalog());
    const [isLoadingOperationalViews, setIsLoadingOperationalViews] = useState(false);
    const [operationalViewLoadFailed, setOperationalViewLoadFailed] = useState(false);
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');
    const [generatedURL, setGeneratedURL] = useState<string | null>("");
    const [commandStatus, setCommandStatus] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!selectedNode) {
            setOperationalViewCatalog(emptyOperationalViewCatalog());
            setOperationalViewLoadFailed(false);
            return;
        }

        setIsLoadingOperationalViews(true);
        setOperationalViewLoadFailed(false);
        selectedNode.fetchOperationalViewCatalog()
            .then((catalog) => {
                if (!cancelled)
                    setOperationalViewCatalog(catalog);
            })
            .catch((error) => {
                console.error(`Unable to load operational views for ${selectedNode.name}`, error);
                if (!cancelled) {
                    setOperationalViewCatalog(emptyOperationalViewCatalog());
                    setOperationalViewLoadFailed(true);
                }
            })
            .finally(() => {
                if (!cancelled)
                    setIsLoadingOperationalViews(false);
            });

        return () => {
            cancelled = true;
        };
    }, [selectedNode]);

    const handleGenerateReport = async() => {
        if (viewError)
            return;

        if (selectedTimeRange === "custom" && (!customStartTime || !customEndTime)){
            setSnackMessage(t('selectCustomDates'));
            setSeverity("error");
            setOpenSnack(true);
            return;
        }

        const resolvedScope = resolveReportScope(
            selectedScope,
            selectedReportType,
            selectedOperationalView,
            selectedLaneUID,
            operationalViewCatalog,
        );
        if (resolvedScope.error) {
            if (resolvedScope.error === "view-required")
                setSnackMessage(t('selectOperationalViewForReport'));
            else if (resolvedScope.error === "empty-view")
                setSnackMessage(t('operationalViewEmpty', {view: selectedOperationalView}));
            else if (resolvedScope.error === "lanes-required")
                setSnackMessage(t('selectLaneForReport'));
            else
                setSnackMessage(t('reportScopeUnavailable'));
            setSeverity("error");
            setOpenSnack(true);
            return;
        }

        let startTime = getTimeRange(selectedTimeRange).startTime;
        let endTime = getTimeRange(selectedTimeRange).endTime;


        let isStreamingStatus = false;

        try {
            if(!selectedNode) return;
            const effectiveLaneUIDs = resolvedScope.laneUIDs;

            setIsGenerating(true);

            let streams: typeof ControlStream[] = [];
            if (selectedNode.oscarServiceSystem != null) {
                const query = await selectedNode.oscarServiceSystem.searchControlStreams(new ControlStreamFilter({ validTime: "latest" }), 100);

                const results = await query.nextPage();
                if (results?.length > 0) {
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
                generateReportCommandJSON(
                    startTime,
                    endTime,
                    selectedReportType,
                    effectiveLaneUIDs.length > 0 ? effectiveLaneUIDs.join(",") : null,
                    selectedEvent,
                )
            );

            if (response.status == 200) {
                const json = await response.json();

                if (json.statusCode === 'PENDING') {
                    const commandId = json['command@id'];
                    isStreamingStatus = true;
                    setCommandStatus('PENDING');

                    const networkProperties = {
                        endpointUrl: `${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}${selectedNode.csAPIEndpoint}`,
                        tls: selectedNode.isSecure,
                        streamProtocol: 'ws',
                        connectorOpts: selectedNode.authenticationMode === "basic" ? {
                            username: selectedNode.auth.username,
                            password: selectedNode.auth.password
                        } : {}
                    };

                    const properties = {
                        id: commandId,
                        'controlstream@id': controlStream.properties.id,
                        'system@id': controlStream.properties['system@id']
                    };

                    const command = new Command(properties, networkProperties);

                    command.getSchema = async () => {
                        return controlStream.getSchema(new ControlStreamFilter({}));
                    };

                    command.streamStatus(new CommandFilter({ format: 'application/json' }), (data: any) => {
                        const messages = Array.isArray(data) ? data : [data];
                        for (const message of messages) {
                            const statusCode = message.statusCode;

                            if (statusCode === 'ACCEPTED') {
                                const reportPath = message?.results?.[0]?.data?.reportPath;
                                if (reportPath) {
                                    const isTls = selectedNode.isSecure ? 'https://' : 'http://';
                                    setGeneratedURL(
                                        `${isTls}${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${reportPath}`
                                    );
                                }
                                setSnackMessage(t('reportCreated'));
                                setSeverity("success");
                                setOpenSnack(true);
                                setIsGenerating(false);
                                setCommandStatus(null);
                                resetForm();
                            } else if (statusCode === 'FAILED') {
                                setSnackMessage(t('reportGenerationFailed'));
                                setSeverity("error");
                                setOpenSnack(true);
                                setIsGenerating(false);
                                setCommandStatus(null);
                                resetForm();
                            } else if (statusCode) {
                                setCommandStatus(statusCode);
                            }
                        }
                    })

                    setSnackMessage(t('reportBeingGenerated'));
                    setSeverity("success");
                    setOpenSnack(true);
                    return;
                }
                else if (json.statusCode === "ACCEPTED") {
                    const isTls = selectedNode.isSecure ? 'https://' : 'http://';
                    setGeneratedURL(
                        `${isTls}${selectedNode.address}:${selectedNode.port}${selectedNode.oshPathRoot}/buckets/${json.results[0].data.reportPath}`
                    );
                    setSnackMessage(t('reportCreated'));
                    setSeverity("success");
                }
            }
            else {
                setSnackMessage(t('reportRequestFailed'));
                setSeverity("error");
            }

        } catch (error) {
            setSnackMessage(t('reportRequestFailed'));
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
        setSelectedLaneUID(value)
    }

    const handleEventTypeSelect = (value: any) => {
        setSelectedEvent(value)
    }

    const handleNodeSelect = (value: any) => {
        const node = nodes.find((node: INode) => node.id == value);
        setSelectedNode(node ?? null);
        setSelectedScope(activeViewKey ? "OPERATIONAL_VIEW" : "NODE");
        setSelectedOperationalView(activeViewKey ?? "");
        setSelectedLaneUID([]);
    }

    const handleScopeSelect = (scope: ReportScope) => {
        setSelectedScope(scope);
        if (scope === "OPERATIONAL_VIEW" && !selectedOperationalView && activeViewKey)
            setSelectedOperationalView(activeViewKey);
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
        setSelectedEvent(null);
        setSelectedReportType("")
        setSelectedTimeRange("");
        setSelectedNode(null);
        setSelectedLaneUID([]);
        setSelectedScope(activeViewKey ? "OPERATIONAL_VIEW" : "NODE");
        setSelectedOperationalView(activeViewKey ?? "");
        setOperationalViewCatalog(emptyOperationalViewCatalog());
        setOperationalViewLoadFailed(false);
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

        <Box>
            <Grid container spacing={4}>
                <Grid item xs={12} md={5}>
                    <Typography variant="h5" align="center" gutterBottom>
                        {t('generateAReport')}
                    </Typography>

                    <Stack spacing={3}>
                        <NodeSelect onSelect={handleNodeSelect} node={selectedNode?.id} />

                        {selectedNode && (
                            <>
                                <ReportScopeSelect scope={selectedScope} onSelect={handleScopeSelect}/>

                                {selectedScope === "OPERATIONAL_VIEW" && (
                                    <OperationalViewSelect
                                        catalog={operationalViewCatalog}
                                        value={selectedOperationalView}
                                        loading={isLoadingOperationalViews}
                                        onSelect={setSelectedOperationalView}
                                    />
                                )}

                                {selectedScope === "LANES" && (
                                    <LaneSelect
                                        onSelect={handleLaneSelect}
                                        lane={selectedLaneUID}
                                        selectedNode={selectedNode}
                                        laneOptions={operationalViewCatalog.lanes}
                                    />
                                )}

                                {isLoadingOperationalViews && (
                                    <Typography variant="body2" color="text.secondary">
                                        {t('loadingOperationalViews')}
                                    </Typography>
                                )}

                                {operationalViewLoadFailed && (
                                    <Alert severity="error">{t('operationalViewLoadFailed')}</Alert>
                                )}

                                <ReportTypeSelect onSelect={handleReportTypeSelect} report={selectedReportType} />

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
                            disabled={isGenerating || isLoadingOperationalViews || !selectedReportType || !selectedTimeRange || !selectedNode || Boolean(viewError) || (Boolean(activeViewKey) && !laneMapReady)}
                        >
                            {isGenerating ? t('generatingReport') : t('generateReport')}
                        </Button>

                        {commandStatus && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1 }}>
                                <CircularProgress size={20} />
                                <Typography variant="body2" color="text.secondary">
                                    {t('statusValue', {status: commandStatus})}
                                </Typography>
                            </Box>
                        )}

                    </Stack>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper elevation={3} sx={{ padding: 2, height: "100%" }}>
                        <Typography variant="h5" align="center" gutterBottom>
                            {t('generatedReport')}
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
                                    {t('generateReportPrompt')}
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
