"use client";

import {Alert, Box, Button, Paper, Snackbar, SnackbarCloseReason, Stack, Typography} from "@mui/material";
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


export default function NationalViewPage() {
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

        if (selectedTimeRange == "custom" && (!customStartTime || !customEndTime)) {
            setSnackMessage("Please select both custom start and end dates.");
            setSeverity("error");
            setOpenSnack(true)
        }

        try {
            setIsRefreshing(true);

            for (const node of nodes) {
                console.log("node", node);
                let streams = await node.fetchNodeControlStreams();

                console.log("streams: ", streams)

                let controlStream = streams.find((stream: typeof ControlStream) => isNationalControlStream(stream));

                console.log("control stream: ", controlStream)

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

                setSnackMessage("Refreshing the stats");
                setSeverity("success");
            }

            fetchAllObservationData(nodes);
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
        if (nodes && nodes.length > 0){
            handleRefreshStats();
        }
    }, [nodes]);

    useEffect(() => {
        const cached = timeRangeCache.current.get(selectedTimeRange);
        if (cached) {
            setSelectedTimeRangeCounts(cached)
        }
    }, [selectedTimeRange]);

    const fetchAllObservationData = async (nodeList: any[])=>  {
        const tempRangeData: Map<string, INationalTableData[]> = new Map();

        const ranges = ["allTime", "daily", "monthly", "weekly"];

        ranges.forEach(range => {
            tempRangeData.set(range, []);
        });

        for (const node of nodeList) {
            try {
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
            } catch (error) {
                setSnackMessage(`Error processing node ${node.name}:`);
                setSeverity("error");
                setOpenSnack(true)
            }
        }

        for (const [range, counts] of tempRangeData.entries()) {
            timeRangeCache.current.set(range, counts);
        }

        setSelectedTimeRangeCounts(tempRangeData.get(selectedTimeRange));
    }

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
        };
    }

    return (
        <Box sx={{ padding: 4}} >

            <Typography variant="h4" gutterBottom>
                National View
            </Typography>

            <Stack
                spacing={3}
                direction="row"
            >
                <TimeRangeSelect
                    onSelect={handleTimeRange}
                    timeRange={selectedTimeRange}
                />

                {selectedTimeRange === 'custom' && (
                    <NationalDatePicker
                        customStartTime={customStartTime}
                        customEndTime={customEndTime}
                        onCustomStartChange={handleCustomStartTime}
                        onCustomEndChange={handleCustomEndTime}
                    />
                )}

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleRefreshStats}
                    startIcon={<RefreshRounded/>}
                    fullWidth
                    disabled={isRefreshing}
                    >
                    { isRefreshing ? 'Refreshing Stats...' : 'Refresh Stats'}
                </Button>
            </Stack>

            <br/>
            <Paper variant='outlined' sx={{height: "100%"}}>
                <NationalStatsTable selectedTimeRangeCounts={selectedTimeRangeCounts}/>
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
        </Box>
    );
}