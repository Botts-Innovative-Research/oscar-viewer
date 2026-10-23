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
import {generateNationalCommandJSON} from "@/lib/data/oscar/OSCARCommands";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { useBreakpoint } from "../providers";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {
    executeStatisticsCommand,
    getInlineStatisticsResult,
    getObservationStatisticsResult,
    StatisticsCommandStatus,
} from "@/lib/data/oscar/StatisticsCommands";


export default function NationalViewPage() {

    const { isMobile } = useBreakpoint();

    const { t } = useLanguage();

    const[isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);

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
    const mounted = useRef(true);
    const refreshAbortController = useRef<AbortController | null>(null);
    const selectedTimeRangeRef = useRef(selectedTimeRange);
    const statisticsGeneration = useRef(0);

    const timeRangeCache = useRef<Map<string, INationalTableData[]>>(new Map());

    const throwIfStale = (signal: AbortSignal, generation: number) => {
        if (!signal.aborted && generation === statisticsGeneration.current)
            return;

        if (signal.reason instanceof Error)
            throw signal.reason;
        throw new DOMException("Statistics request was superseded", "AbortError");
    };

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
        signal?: AbortSignal,
    ) => {
        const status = await executeStatisticsCommand(
            node,
            controlStream,
            generateNationalCommandJSON(start, end, laneUIDs),
            {signal},
        );
        return parseStatistics(getInlineStatisticsResult(status));
    };

    const fetchScopedTimeRangesForNode = async (
        node: any,
        controlStream: typeof ControlStream,
        laneUIDs: string[],
        signal?: AbortSignal,
    ) => {
        const end = new Date();
        const ranges = {
            allTime: new Date(0),
            monthly: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000),
            weekly: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000),
            daily: new Date(end.getTime() - 24 * 60 * 60 * 1000),
        };
        // Scoped range queries all scan the same potentially large datastore. Running
        // them in parallel made a page load contend with itself and allowed a second
        // Refresh click to double that load. Keep one expensive range query in flight.
        const entries: Array<[string, ReturnType<typeof parseStatistics>]> = [];
        for (const [name, start] of Object.entries(ranges)) {
            if (signal?.aborted)
                throw signal.reason instanceof Error
                    ? signal.reason
                    : new DOMException("Statistics request was aborted", "AbortError");
            entries.push([name, await requestScopedStatistics(
                node,
                controlStream,
                start.toISOString(),
                end.toISOString(),
                laneUIDs,
                signal,
            )]);
        }
        return Object.fromEntries(entries);
    };

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            refreshAbortController.current?.abort();
        };
    }, []);


    const handleRefreshStats = async() => {
        if (viewError || isInitialLoading || isRefreshing)
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

        refreshAbortController.current?.abort();
        const abortController = new AbortController();
        refreshAbortController.current = abortController;
        const generation = statisticsGeneration.current;

        try {
            setIsRefreshing(true);

            for (const node of nodes) {
                const laneUIDs = activeViewKey ? getLaneUIDsForNode(node) : [];
                if (activeViewKey && laneUIDs.length === 0)
                    continue;

                const controlStream = await getStatisticsControlStream(node);
                throwIfStale(abortController.signal, generation);

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

                    const results = await requestScopedStatistics(
                        node,
                        controlStream,
                        customStartTime,
                        customEndTime,
                        laneUIDs,
                        abortController.signal,
                    );
                    throwIfStale(abortController.signal, generation);

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
                    let allRangeCounts;
                    if (activeViewKey) {
                        allRangeCounts = await fetchScopedTimeRangesForNode(
                            node,
                            controlStream,
                            laneUIDs,
                            abortController.signal,
                        );
                    } else {
                        const status = await executeStatisticsCommand(
                            node,
                            controlStream,
                            generateNationalCommandJSON(null, null),
                            {signal: abortController.signal},
                        );
                        allRangeCounts = await fetchAllTimeRangesForStatus(
                            node,
                            status,
                            abortController.signal,
                        );
                    }
                    throwIfStale(abortController.signal, generation);

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

            throwIfStale(abortController.signal, generation);
            timeRangeCache.current = tempRangeData;

            setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRangeRef.current) ?? []);

        } catch (error) {
            if (!abortController.signal.aborted && mounted.current) {
                setSnackMessage(t('statisticsRefreshFailed'));
                setSeverity("error");
            }

        } finally {
            if (refreshAbortController.current === abortController
                && generation === statisticsGeneration.current) {
                refreshAbortController.current = null;
                if (mounted.current) {
                    setIsRefreshing(false);
                    if (!abortController.signal.aborted)
                        setOpenSnack(true);
                }
            }
        }
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason) => {
        if (reason === 'clickaway')
            return;
        setOpenSnack(false);
    };

    const handleTimeRange = (value: string) => {
        selectedTimeRangeRef.current = value;
        setSelectedTimeRange(value)
    }

    const handleCustomStartTime = (value: string) => {
         setCustomStartTime(value)
    }

    const handleCustomEndTime = (value: string) => {
        setCustomEndTime(value)
    }

    useEffect(() => {
        const generation = ++statisticsGeneration.current;
        refreshAbortController.current?.abort();
        refreshAbortController.current = null;
        timeRangeCache.current = new Map();
        setSelectedTimeRangeCounts([]);
        setIsRefreshing(false);

        if (!nodes || nodes.length === 0 || !laneMapReady || viewError) {
            setIsInitialLoading(false);
            return;
        }

        const abortController = new AbortController();
        setIsInitialLoading(true);

        const loadInitialStats = async () => {
            try {
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
                        throwIfStale(abortController.signal, generation);
                        if (!controlStream)
                            continue;
                        allRangeCounts = await fetchScopedTimeRangesForNode(
                            node,
                            controlStream,
                            laneUIDs,
                            abortController.signal,
                        );
                    } else {
                        allRangeCounts = await fetchAllTimeRangesForNode(
                            node,
                            abortController.signal,
                        );
                    }
                    throwIfStale(abortController.signal, generation);

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

                throwIfStale(abortController.signal, generation);
                timeRangeCache.current = tempRangeData;
                setSelectedTimeRangeCounts(
                    tempRangeData.get(selectedTimeRangeRef.current) ?? [],
                );
            } catch (error) {
                if (!abortController.signal.aborted
                    && generation === statisticsGeneration.current)
                    console.error("Unable to load national statistics", error);
            } finally {
                if (mounted.current && generation === statisticsGeneration.current)
                    setIsInitialLoading(false);
            }

        }

        loadInitialStats();
        return () => {
            abortController.abort();
            refreshAbortController.current?.abort();
            refreshAbortController.current = null;
            if (statisticsGeneration.current === generation)
                statisticsGeneration.current++;
        };
    }, [nodes, activeViewKey, laneMapReady, laneMap, viewError]);


    useEffect(() => {
        const cached = timeRangeCache.current.get(selectedTimeRange);
        if (cached) {
            setSelectedTimeRangeCounts(cached)
        }
    }, [selectedTimeRange]);

    const fetchAllTimeRangesForNode = async(
        node: any,
        signal?: AbortSignal,
    ): Promise<any> => {
        if (signal?.aborted)
            throw signal.reason instanceof Error
                ? signal.reason
                : new DOMException("Statistics request was aborted", "AbortError");
        setSnackMessage(t('fetchingStatistics'))
        setSeverity('success');
        setOpenSnack(true);

        const filter = new ObservationFilter({ observedProperty: NATIONAL_DEF, resultTime: "latest" });
        const observation = await node.fetchLatestObservationWithFilter(filter);
        if (signal?.aborted)
            throw signal.reason instanceof Error
                ? signal.reason
                : new DOMException("Statistics request was aborted", "AbortError");

        if (observation == null) {
            setSnackMessage(t('noObservationsFound'))
            setSeverity('error');
            setOpenSnack(true);
        }

        var result = observation[0].properties.result;

        return parseTimeRangeStatistics(result);
    }

    const fetchAllTimeRangesForStatus = async(
        node: any,
        status: StatisticsCommandStatus,
        signal: AbortSignal,
    ): Promise<any> => {
        setSnackMessage(t('fetchingStatistics'));
        setSeverity('success');
        setOpenSnack(true);

        const result = await getObservationStatisticsResult(node, status, signal);
        return parseTimeRangeStatistics(result);
    }

    const parseTimeRangeStatistics = (result: any) => {
        return {
            allTime: parseStatistics(result.allTime),
            monthly: parseStatistics(result.monthly),
            weekly: parseStatistics(result.weekly),
            daily: parseStatistics(result.daily),
            custom: parseStatistics(result.custom ?? {})
        };
    }

    const statisticsBusy = isInitialLoading || isRefreshing;

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
                        disabled={statisticsBusy}
                    />
                </Grid>
                {selectedTimeRange === 'custom' && (
                    <Grid item xs={12} sm={12} md={"auto"}>
                        <NationalDatePicker
                            onCustomStartChange={handleCustomStartTime}
                            onCustomEndChange={handleCustomEndTime}
                            disabled={statisticsBusy}
                        />
                    </Grid>

                )}
                <Grid item xs={12} sm={(selectedTimeRange === 'custom') ? 12 : 6} md={"auto"}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRefreshStats}
                        startIcon={<RefreshRounded/>}
                        disabled={statisticsBusy || Boolean(viewError)}
                        aria-busy={statisticsBusy}
                        fullWidth
                    >
                        {statisticsBusy ? t('refreshingStats') : t('refreshStats')}
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
