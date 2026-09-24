"use client";

import {Alert, Box, Button, Grid, Paper, Snackbar, SnackbarCloseReason, Stack, Typography} from "@mui/material";
import NationalStatsTable from "../_components/national/NationalStatsTable";
import NationalDatePicker from "../_components/national/NationalDatePicker";
import TimeRangeSelect from "@/app/_components/national/TimeRangeSelector";
import React, {useContext, useEffect, useRef, useState} from "react";
import {RefreshRounded} from "@mui/icons-material";
import {useSelector} from "react-redux";
import {selectNodes} from "@/lib/state/OSHSlice";
import {INationalTableData} from "../../../types/new-types";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {NATIONAL_DEF} from "@/lib/data/Constants";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isNationalControlStream} from "@/lib/data/oscar/Utilities";
import {generateNationalCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { useBreakpoint } from "../providers";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";


export default function NationalViewPage() {

    const { isMobile } = useBreakpoint();

    const { t } = useLanguage();

    const[isRefreshing, setIsRefreshing] = useState(false);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

    const [selectedTimeRange, setSelectedTimeRange]= useState("allTime");

    const [customStartTime, setCustomStartTime] = useState<string | null>();
    const [customEndTime, setCustomEndTime] = useState<string | null>();

    const [selectedTimeRangeCounts, setSelectedTimeRangeCounts] = useState<INationalTableData[]>([]);

    const nodes = useSelector(selectNodes);
    const laneMap = useSelector(selectLaneMap);
    const {activeViewKey, laneMapReady, viewError} = useContext(DataSourceContext);
    const idVal = useRef(0);

    const timeRangeCache = useRef<Map<string, INationalTableData[]>>(new Map());

    const getLaneUIDsForNode = (node: any): string[] => Array.from(laneMap.values())
        .filter((lane) => lane.parentNode.id === node.id)
        .map((lane) => lane.laneSystem?.properties?.properties?.uid)
        .filter((uid): uid is string => typeof uid === "string");

    const getStatisticsControlStream = async (node: any): Promise<typeof ControlStream | undefined> => {
        let streams: typeof ControlStream[] = [];
        if (node.oscarServiceSystem != null) {
            const query = await node.oscarServiceSystem.searchControlStreams(
                new ControlStreamFilter({validTime: "latest"}), 100);
            const results = await query.nextPage();
            if (results?.length)
                streams = results;
        } else {
            streams = await node.fetchNodeControlStreams();
        }
        return streams.find((stream: typeof ControlStream) => isNationalControlStream(stream));
    };

    const parseStatistics = (result: any) => ({
        numOccupancies: result?.numOccupancies ?? 0,
        numGammaAlarms: result?.numGammaAlarms ?? 0,
        numNeutronAlarms: result?.numNeutronAlarms ?? 0,
        numGammaNeutronAlarms: result?.numGammaNeutronAlarms ?? 0,
        numFaults: result?.numFaults ?? 0,
        numGammaFaults: result?.numGammaFaults ?? 0,
        numNeutronFaults: result?.numNeutronFaults ?? 0,
        numTampers: result?.numTampers ?? 0,
    });

    const requestScopedStatistics = async (
        node: any,
        controlStream: typeof ControlStream,
        start: string,
        end: string,
        laneUIDs: string[],
    ) => {
        const response = await sendCommand(
            node,
            controlStream.properties.id,
            generateNationalCommandJSON(start, end, laneUIDs),
        );
        if (!response.ok)
            throw new Error(`Statistics request failed with status ${response.status}`);
        const payload = await response.json();
        return parseStatistics(payload.results?.[0]?.data);
    };

    const fetchScopedTimeRangesForNode = async (
        node: any,
        controlStream: typeof ControlStream,
        laneUIDs: string[],
    ) => {
        const end = new Date();
        const ranges = {
            allTime: new Date(0),
            monthly: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
            weekly: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000),
            daily: new Date(end.getTime() - 24 * 60 * 60 * 1000),
        };
        const entries = await Promise.all(Object.entries(ranges).map(async ([name, start]) => [
            name,
            await requestScopedStatistics(node, controlStream, start.toISOString(), end.toISOString(), laneUIDs),
        ]));
        return Object.fromEntries(entries);
    };


    const handleRefreshStats = async() => {
        if (viewError)
            return;

        const tempRangeData: Map<string, INationalTableData[]> = new Map();

        const ranges = ["allTime", "daily", "monthly", "weekly", "custom"];

        ranges.forEach(range => {
            tempRangeData.set(range, []);
        });

        if (selectedTimeRange == "custom" && (!customStartTime || !customEndTime)) {
            setSnackMessage(t('selectCustomDates'));
            setSeverity("error");
            setOpenSnack(true);
            return;
        }

        try {
            setIsRefreshing(true);

            for (const node of nodes) {
                const laneUIDs = activeViewKey ? getLaneUIDsForNode(node) : [];
                if (activeViewKey && laneUIDs.length === 0)
                    continue;

                const controlStream = await getStatisticsControlStream(node);

                if (!controlStream){
                    setSnackMessage(t('noControlStream'));
                    setSeverity("error");
                    setOpenSnack(true);
                    continue;
                }

                if (selectedTimeRange == "custom") {
                    setSnackMessage(t('refreshingCustomStats'));
                    setSeverity("success");
                    setOpenSnack(true);

                    let results;
                    if (activeViewKey) {
                        results = await requestScopedStatistics(
                            node, controlStream, customStartTime, customEndTime, laneUIDs);
                    } else {
                        const response = await sendCommand(
                            node,
                            controlStream.properties.id,
                            generateNationalCommandJSON(customStartTime, customEndTime),
                        );
                        if (!response.ok)
                            throw new Error(`Statistics request failed with status ${response.status}`);
                        const payload = await response.json();
                        results = parseStatistics(payload.results?.[0]?.data);
                    }

                    const list = tempRangeData.get("custom");
                    list.push({
                        id: idVal.current++,
                        site: node.name,
                        numGammaAlarms: results.numGammaAlarms,
                        numNeutronAlarms: results.numNeutronAlarms,
                        numGammaNeutronAlarms: results.numGammaNeutronAlarms,
                        numOccupancies: results.numOccupancies,
                        numTampers: results.numTampers,
                        numGammaFaults: results.numGammaFaults,
                        numNeutronFaults: results.numNeutronFaults,
                        numFaults: results.numFaults,
                    });

                } else {
                    if (!activeViewKey) {
                        const response = await sendCommand(
                            node,
                            controlStream.properties.id,
                            generateNationalCommandJSON(null, null),
                        );
                        if (!response.ok)
                            throw new Error(`Statistics refresh failed with status ${response.status}`);
                    }

                    const allRangeCounts = activeViewKey
                        ? await fetchScopedTimeRangesForNode(node, controlStream, laneUIDs)
                        : await fetchAllTimeRangesForNode(node);

                    ranges.filter((range) => range !== "custom").forEach(range => {
                        const list = tempRangeData.get(range);
                        list.push ({
                            id: idVal.current++,
                            site: node.name,
                            numGammaAlarms: allRangeCounts[range].numGammaAlarms,
                            numNeutronAlarms: allRangeCounts[range].numNeutronAlarms,
                            numGammaNeutronAlarms: allRangeCounts[range].numGammaNeutronAlarms,
                            numOccupancies: allRangeCounts[range].numOccupancies,
                            numTampers: allRangeCounts[range].numTampers,
                            numGammaFaults: allRangeCounts[range].numGammaFaults,
                            numNeutronFaults: allRangeCounts[range].numNeutronFaults,
                            numFaults: allRangeCounts[range].numFaults,
                        });
                    });
                }

                setSnackMessage(t('refreshingStats'));
                setSeverity("success");
            }

            for (const [range, counts] of tempRangeData.entries()) {
                timeRangeCache.current.set(range, counts);
            }

            setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRange));

        } catch (error) {
            setSnackMessage(t('statisticsRefreshFailed'));
            setSeverity("error");

        } finally {
            setIsRefreshing(false);
            setOpenSnack(true);
        }
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway')
            return;
        setOpenSnack(false);
    };

    const handleTimeRange = (value: string) => {
        setSelectedTimeRange(value)
    }

    const handleCustomStartTime = (value: string) => {
         setCustomStartTime(value)
    }

    const handleCustomEndTime = (value: string) => {
        setCustomEndTime(value)
    }

    useEffect(() => {
        if (!nodes || nodes.length === 0 || !laneMapReady || viewError) return;

        const loadInitialStats = async () => {
            const tempRangeData: Map<string, INationalTableData[]> = new Map();

            const ranges = ["allTime", "daily", "monthly", "weekly", "custom"];

            ranges.forEach(range => {
                tempRangeData.set(range, []);
            });

            for (const node of nodes) {
                const laneUIDs = activeViewKey ? getLaneUIDsForNode(node) : [];
                if (activeViewKey && laneUIDs.length === 0)
                    continue;

                let allRangeCounts;
                if (activeViewKey) {
                    const controlStream = await getStatisticsControlStream(node);
                    if (!controlStream)
                        continue;
                    allRangeCounts = await fetchScopedTimeRangesForNode(node, controlStream, laneUIDs);
                } else {
                    allRangeCounts = await fetchAllTimeRangesForNode(node);
                }

                ranges.filter((range) => range !== "custom").forEach((range: string) => {
                    const list = tempRangeData.get(range);
                    list.push ({
                        id: idVal.current++,
                        site: node.name,
                        numGammaAlarms: allRangeCounts[range].numGammaAlarms,
                        numNeutronAlarms: allRangeCounts[range].numNeutronAlarms,
                        numGammaNeutronAlarms: allRangeCounts[range].numGammaNeutronAlarms,
                        numOccupancies: allRangeCounts[range].numOccupancies,
                        numTampers: allRangeCounts[range].numTampers,
                        numGammaFaults: allRangeCounts[range].numGammaFaults,
                        numNeutronFaults: allRangeCounts[range].numNeutronFaults,
                        numFaults: allRangeCounts[range].numFaults,
                    });
                })
            }

            for (const [range, counts] of tempRangeData.entries()) {
                timeRangeCache.current.set(range, counts);
            }

            setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRange));

        }

        loadInitialStats();
    }, [nodes, activeViewKey, laneMapReady, laneMap, viewError]);


    useEffect(() => {
        const cached = timeRangeCache.current.get(selectedTimeRange);
        if (cached) {
            setSelectedTimeRangeCounts(cached)
        }
    }, [selectedTimeRange]);

    const fetchAllTimeRangesForNode = async(node: any): Promise<any> => {
        setSnackMessage(t('fetchingStatistics'))
        setSeverity('success');
        setOpenSnack(true);

        const filter = new ObservationFilter({ observedProperty: NATIONAL_DEF, resultTime: "latest" });
        const observation = await node.fetchLatestObservationWithFilter(filter);

        if (observation == null) {
            setSnackMessage(t('noObservationsFound'))
            setSeverity('error');
            setOpenSnack(true);
        }

        var result = observation[0].properties.result;

        return {
            allTime: parseStatistics(result.allTime),
            monthly: parseStatistics(result.monthly),
            weekly: parseStatistics(result.weekly),
            daily: parseStatistics(result.daily),
            custom: parseStatistics(result.custom ?? {})
        };
    }

    return (
        <Grid container spacing={2} width={"100%"}>

            {/* HEADER */}
            <Grid item xs={12}>
                <Typography variant="h4">
                    { t('national') }
                </Typography>
            </Grid>

            {/* OPTIONS */}
            <Grid item container xs={12} spacing={2} alignItems={"center"}>
                <Grid item xs={12} sm={(selectedTimeRange === 'custom') ? 12 : 6} md={"auto"}>
                    <TimeRangeSelect
                        onSelect={handleTimeRange}
                        timeRange={selectedTimeRange}
                    />
                </Grid>
                {selectedTimeRange === 'custom' && (
                    <Grid item xs={12} sm={12} md={"auto"}>
                        <NationalDatePicker
                            onCustomStartChange={handleCustomStartTime}
                            onCustomEndChange={handleCustomEndTime}
                        />
                    </Grid>

                )}
                <Grid item xs={12} sm={(selectedTimeRange === 'custom') ? 12 : 6} md={"auto"}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRefreshStats}
                        startIcon={<RefreshRounded/>}
                        disabled={isRefreshing || Boolean(viewError)}
                        fullWidth
                    >
                        {isRefreshing ? t('refreshingStats') : t('refreshStats')}
                    </Button>
                </Grid>
            </Grid>

            {/* TABLE */}
            <Grid item xs={12}>
                <Paper variant='outlined' sx={{ height: "100%", padding: 0 }}>
                    <NationalStatsTable selectedTimeRangeCounts={selectedTimeRangeCounts}/>
                </Paper>
            </Grid>

            {/* SNACKBAR */}
            <Grid item xs={12}>
                <Snackbar
                    open={openSnack}
                    autoHideDuration={5000}
                    onClose={handleCloseSnack}
                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                >
                    <Snackbar
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        open={openSnack}
                        autoHideDuration={1500}
                        onClose={handleCloseSnack}
                        message={snackMessage}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: severity === 'success' ? 'green' : 'red',
                            },
                        }}
                    />
                </Snackbar>
            </Grid>

        </Grid>
    );
}
