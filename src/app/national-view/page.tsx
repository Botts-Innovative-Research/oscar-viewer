"use client";

import {Alert, Box, Button, Grid, Paper, Snackbar, SnackbarCloseReason, Stack, Typography} from "@mui/material";
import NationalStatsTable from "../_components/national/NationalStatsTable";
import NationalDatePicker from "../_components/national/NationalDatePicker";
import TimeRangeSelect from "@/app/_components/national/TimeRangeSelector";
import React, {useEffect, useRef, useState} from "react";
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


export default function NationalViewPage() {

    const { isMobile } = useBreakpoint();

    const[isRefreshing, setIsRefreshing] = useState(false);

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState<string>();
    const [severity, setSeverity] = useState<'success' | 'error'>('success');

    const [selectedTimeRange, setSelectedTimeRange]= useState("allTime");

    const [customStartTime, setCustomStartTime] = useState<string | null>();
    const [customEndTime, setCustomEndTime] = useState<string | null>();

    const [selectedTimeRangeCounts, setSelectedTimeRangeCounts] = useState<INationalTableData[]>([]);

    const nodes = useSelector(selectNodes);
    const idVal = useRef(0);

    const timeRangeCache = useRef<Map<string, INationalTableData[]>>(new Map());


    const handleRefreshStats = async() => {

        const tempRangeData: Map<string, INationalTableData[]> = new Map();

        const ranges = ["allTime", "daily", "monthly", "weekly", "custom"];

        ranges.forEach(range => {
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
                    const query = await node.oscarServiceSystem.searchControlStreams(new ControlStreamFilter({ validTime: "latest" }), 100);

                    const results = await query.nextPage();
                    if (results || results.length > 0) {
                        streams = results;
                    }
                } else {
                    streams = await node.fetchNodeControlStreams();
                }
                let controlStream = streams.find((stream: typeof ControlStream) => isNationalControlStream(stream));

                if (!controlStream){
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
                    });

                } else {

                    const allRangeCounts = await fetchAllTimeRangesForNode(node);

                    ranges.forEach(range => {
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
        if (!nodes || nodes.length === 0) return;

        const loadInitialStats = async () => {
            const tempRangeData: Map<string, INationalTableData[]> = new Map();

            const ranges = ["allTime", "daily", "monthly", "weekly", "custom"];

            ranges.forEach(range => {
                tempRangeData.set(range, []);
            });

            for (const node of nodes) {
                const allRangeCounts = await fetchAllTimeRangesForNode(node);

                ranges.forEach((range: string) => {
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
    }, [nodes]);


    useEffect(() => {
        const cached = timeRangeCache.current.get(selectedTimeRange);
        if (cached) {
            setSelectedTimeRangeCounts(cached)
        }
    }, [selectedTimeRange]);

    const fetchAllTimeRangesForNode = async(node: any): Promise<any> => {
        setSnackMessage("Fetching counts for stats!")
        setSeverity('success');
        setOpenSnack(true);

        const filter = new ObservationFilter({ observedProperty: NATIONAL_DEF, resultTime: "latest" });
        const observation = await node.fetchLatestObservationWithFilter(filter);

        if (observation == null) {
            setSnackMessage("no observations found")
            setSeverity('error');
            setOpenSnack(true);
        }

        console.log('observation', observation)
        var result = observation[0].properties.result;

        const parse = (result: any) => ({
            numOccupancies: result.numOccupancies ?? 0,
            numGammaAlarms: result.numGammaAlarms?? 0,
            numNeutronAlarms: result.numNeutronAlarms ?? 0,
            numGammaNeutronAlarms: result.numGammaNeutronAlarms ?? 0,
            numFaults: result.numFaults ?? 0,
            numGammaFaults: result.numGammaFaults ?? 0,
            numNeutronFaults: result.numNeutronFaults ?? 0,
            numTampers: result.numTampers ?? 0
        });

        return {
            allTime: parse(result.allTime),
            monthly: parse(result.monthly),
            weekly: parse(result.weekly),
            daily: parse(result.daily),
            custom: parse(result.custom ?? {})
        };
    }

    return (
        <Grid container spacing={2} width={"100%"}>
            
            {/* HEADER */}
            <Grid item xs={12}>
                <Typography variant="h4">
                    National View
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
                        disabled={isRefreshing}
                        fullWidth
                    >
                        { isRefreshing ? 'Refreshing Stats...' : 'Refresh Stats'}
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