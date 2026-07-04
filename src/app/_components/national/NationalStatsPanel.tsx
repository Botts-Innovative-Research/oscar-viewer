"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Button, Grid, Paper, Snackbar, SnackbarCloseReason} from "@mui/material";
import NationalStatsTable from "./NationalStatsTable";
import NationalDatePicker from "./NationalDatePicker";
import TimeRangeSelect from "./TimeRangeSelector";
import React, {useEffect, useRef, useState} from "react";
import {RefreshRounded} from "@mui/icons-material";
import {useSelector} from "react-redux";
import {selectNodes} from "@/lib/state/OSHSlice";
import {ILaneStat, INationalTableData} from "../../../../types/new-types";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {NATIONAL_DEF} from "@/lib/data/Constants";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {isNationalControlStream} from "@/lib/data/oscar/Utilities";
import {generateNationalCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";

export const NATIONAL_TIME_RANGES = ["allTime", "daily", "monthly", "weekly", "custom"];

/**
 * National statistics table with time-range controls and on-demand refresh.
 * Extracted from the national-view page so it can also run as a widget.
 */
export default function NationalStatsPanel({defaultTimeRange = "allTime"}: { defaultTimeRange?: string }) {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

    const [selectedTimeRange, setSelectedTimeRange] = useState(
        NATIONAL_TIME_RANGES.includes(defaultTimeRange) ? defaultTimeRange : "allTime");

    const [customStartTime, setCustomStartTime] = useState<string | null>();
    const [customEndTime, setCustomEndTime] = useState<string | null>();

    const [selectedTimeRangeCounts, setSelectedTimeRangeCounts] = useState<INationalTableData[]>([]);

    const nodes = useSelector(selectNodes);
    const idVal = useRef(0);

    const timeRangeCache = useRef<Map<string, INationalTableData[]>>(new Map());

    const handleRefreshStats = async () => {

        const tempRangeData: Map<string, INationalTableData[]> = new Map();

        NATIONAL_TIME_RANGES.forEach(range => {
            tempRangeData.set(range, []);
        });

        if (selectedTimeRange == "custom" && (!customStartTime || !customEndTime)) {
            setSnackMessage("Please select both custom start and end dates.");
            setSeverity("error");
            setOpenSnack(true)
        }

        try {
            setIsRefreshing(true);

            for (const node of nodes) {
                let streams: typeof ControlStream[];
                if (node.oscarServiceSystem != null) {
                    const query = await node.oscarServiceSystem.searchControlStreams(new ControlStreamFilter({validTime: "latest"}), 100);

                    const results = await query.nextPage();
                    if (results || results.length > 0) {
                        streams = results;
                    }
                } else {
                    streams = await node.fetchNodeControlStreams();
                }
                let controlStream = streams.find((stream: typeof ControlStream) => isNationalControlStream(stream));

                if (!controlStream) {
                    setSnackMessage("No control stream found.");
                    setSeverity("error");
                    setOpenSnack(true)
                }

                let response = await sendCommand(node, controlStream.properties.id, generateNationalCommandJSON(customStartTime, customEndTime));

                if (!response.ok) {
                    setSnackMessage("Failed to refresh the statistics");
                    setSeverity("error");
                }

                let respJson = await response.json();

                if (selectedTimeRange == "custom") {
                    setSnackMessage("Refreshing the custom time range stats");
                    setSeverity("success");
                    setOpenSnack(true);

                    let results = respJson.results[0].data;

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
                        lanes: parseLanes(results.byLane),
                    });

                } else {

                    const allRangeCounts = await fetchAllTimeRangesForNode(node);

                    NATIONAL_TIME_RANGES.forEach(range => {
                        const list = tempRangeData.get(range);
                        list.push({
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
                            lanes: allRangeCounts[range].lanes,
                        });
                    })
                }

                setSnackMessage("Refreshing the stats");
                setSeverity("success");
            }

            for (const [range, counts] of tempRangeData.entries()) {
                timeRangeCache.current.set(range, counts);
            }

            setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRange));

        } catch (error) {
            setSnackMessage("Failed to refresh the statistics");
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

    useEffect(() => {
        if (!nodes || nodes.length === 0) return;

        const loadInitialStats = async () => {
            const tempRangeData: Map<string, INationalTableData[]> = new Map();

            NATIONAL_TIME_RANGES.forEach(range => {
                tempRangeData.set(range, []);
            });

            for (const node of nodes) {
                const allRangeCounts = await fetchAllTimeRangesForNode(node);

                NATIONAL_TIME_RANGES.forEach((range: string) => {
                    const list = tempRangeData.get(range);
                    list.push({
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
                        lanes: allRangeCounts[range].lanes,
                    });
                })
            }

            for (const [range, counts] of tempRangeData.entries()) {
                timeRangeCache.current.set(range, counts);
            }

            setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRange));

        }

        loadInitialStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes]);


    useEffect(() => {
        const cached = timeRangeCache.current.get(selectedTimeRange);
        if (cached) {
            setSelectedTimeRangeCounts(cached)
        }
    }, [selectedTimeRange]);

    const fetchAllTimeRangesForNode = async (node: any): Promise<any> => {
        setSnackMessage("Fetching counts for stats!")
        setSeverity('success');
        setOpenSnack(true);

        const filter = new ObservationFilter({observedProperty: NATIONAL_DEF, resultTime: "latest"});
        const observation = await node.fetchLatestObservationWithFilter(filter);

        if (observation == null) {
            setSnackMessage("no observations found")
            setSeverity('error');
            setOpenSnack(true);
        }

        var result = observation[0].properties.result;

        const parse = (result: any) => ({
            numOccupancies: result.numOccupancies ?? 0,
            numGammaAlarms: result.numGammaAlarms ?? 0,
            numNeutronAlarms: result.numNeutronAlarms ?? 0,
            numGammaNeutronAlarms: result.numGammaNeutronAlarms ?? 0,
            numFaults: result.numFaults ?? 0,
            numGammaFaults: result.numGammaFaults ?? 0,
            numNeutronFaults: result.numNeutronFaults ?? 0,
            numTampers: result.numTampers ?? 0,
            lanes: parseLanes(result.byLane),
        });

        return {
            allTime: parse(result.allTime),
            monthly: parse(result.monthly),
            weekly: parse(result.weekly),
            daily: parse(result.daily),
            custom: parse(result.custom ?? {})
        };
    }

    function parseLanes(byLane: any): ILaneStat[] {
        if (!Array.isArray(byLane)) return [];
        return byLane.map((l: any) => ({
            laneId: l.laneId ?? "",
            numOccupancies: l.numOccupancies ?? 0,
            numGammaAlarms: l.numGammaAlarms ?? 0,
            numNeutronAlarms: l.numNeutronAlarms ?? 0,
            numGammaNeutronAlarms: l.numGammaNeutronAlarms ?? 0,
            numFaults: l.numFaults ?? 0,
            numGammaFaults: l.numGammaFaults ?? 0,
            numNeutronFaults: l.numNeutronFaults ?? 0,
            numTampers: l.numTampers ?? 0,
            numAdjudicated: l.numAdjudicated ?? 0,
            avgTimeToAdjudicateSec: l.avgTimeToAdjudicateSec ?? 0,
        }));
    }

    return (
        <Grid container spacing={2} width={"100%"}>

            {/* OPTIONS */}
            <Grid item container xs={12} spacing={2} alignItems={"center"}>
                <Grid item xs={12} sm={(selectedTimeRange === 'custom') ? 12 : 6} md={"auto"}>
                    <TimeRangeSelect
                        onSelect={(value: string | string[]) =>
                            setSelectedTimeRange(Array.isArray(value) ? value[0] : value)}
                        timeRange={selectedTimeRange}
                    />
                </Grid>
                {selectedTimeRange === 'custom' && (
                    <Grid item xs={12} sm={12} md={"auto"}>
                        <NationalDatePicker
                            onCustomStartChange={setCustomStartTime}
                            onCustomEndChange={setCustomEndTime}
                        />
                    </Grid>

                )}
                <Grid item xs={12} sm={(selectedTimeRange === 'custom') ? 12 : 6} md={"auto"}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRefreshStats}
                        startIcon={<RefreshRounded/>}
                        disabled={isRefreshing}
                        fullWidth
                    >
                        {isRefreshing ? 'Refreshing Stats...' : 'Refresh Stats'}
                    </Button>
                </Grid>
            </Grid>

            {/* TABLE */}
            <Grid item xs={12}>
                <Paper variant='outlined' sx={{height: "100%", padding: 0}}>
                    <NationalStatsTable selectedTimeRangeCounts={selectedTimeRangeCounts}/>
                </Paper>
            </Grid>

            {/* SNACKBAR */}
            <Grid item xs={12}>
                <Snackbar
                    anchorOrigin={{vertical: 'top', horizontal: 'center'}}
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
            </Grid>

        </Grid>
    );
}
