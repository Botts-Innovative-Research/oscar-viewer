"use client"

import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {Box, Button, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useState} from "react";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {
    isDailyFileDataStream,
} from "@/lib/data/oscar/Utilities";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {Download} from "@mui/icons-material";
import IconButton from "@mui/material/IconButton";
import {useLanguage} from "@/app/contexts/LanguageContext";


export default function DailyFileTable(props: { event: EventTableData }) {
    const {t} = useLanguage();
    const [logs, setLogs] = useState([]);

    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const fetchMessages = useCallback(async () => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.warn("Cannot load daily file: lane entry is unavailable:", currentLane);
            setLogs([]);
            return;
        }

        const datastream: typeof DataStream = currLaneEntry.datastreams.find((ds) => isDailyFileDataStream(ds));
        if (!datastream) {
            console.warn("No daily file datastream found for this lane");
            setLogs([]);
            return;
        }

        try {
            const observations = await datastream.searchObservations(new ObservationFilter({
                resultTime: `${props.event.startTime}/${props.event.endTime}`,
                order: 'asc',
            }), 1000);
            const rows = [];

            while (observations.hasNext()) {
                const page = await observations.nextPage();

                rows.push(...page.flatMap((observation: any) => {
                    const result = observation?.result
                        ?? observation?.properties?.result
                        ?? observation?.results?.[0]?.data;
                    const message = result?.rapiscanMessage ?? result?.aspectMessage;
                    const timestamp = observation?.resultTime
                        ?? observation?.properties?.resultTime
                        ?? observation?.timestamp;


                    return message && timestamp
                        ? [`${message},${timestamp}`]
                        : [];
                }));
            }

            setLogs(rows);
        } catch (error) {
            console.error("Failed to load daily-file messages:", error);
            setLogs([]);
        }

    }, [props.event, laneMapRef]);

    useEffect(() => {
        void fetchMessages();
    }, [fetchMessages]);

    function handleDownload(){
        const csvContent = logs.join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `exported_dailyfile_${props.event.startTime}_${props.event.endTime}.csv`);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return(
        <Box sx={{height: 300, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h5">
                    {t('dailyFileOccupancy')}
                </Typography>
                <IconButton
                    aria-label="download"
                    onClick={() => {
                    handleDownload()
                    }}
                >
                    <Download />
                </IconButton>
            </Stack>
            <Box
                component="pre"
                sx={{
                    flexGrow: 1,
                    height: 'calc(100% - 40px)',
                    overflowY: 'auto',
                    padding: '10px',
                    margin: 0,
                    boxSizing: 'border-box',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}
            >
                {logs.join('\n')}
            </Box>
        </Box>
    )
}
