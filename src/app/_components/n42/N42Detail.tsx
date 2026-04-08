import {Box, Grid, IconButton, Typography} from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import React, {useCallback, useContext, useEffect, useState} from "react";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {N42_REPORT_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import N42ChartPlayback from "@/app/_components/n42/N42ChartPlayback";
import {randomUUID} from "osh-js/source/core/utils/Utils";

export interface N42Report {
    samplingTime: string;
    duration: number;
    linearSpectrumCount: number;
    linearSpectrum: number[];
    compressedSpectrumCount: number;
    compressedSpectrum: number[];
    gammaGrossCount: number;
    neutronGrossCount: number;
    dose: string;
}

interface N42FileData {
    fileName: string;
    foregroundReports: N42Report[];
    backgroundReports: N42Report[];
}

const FILENAME = "fileName";
const OCCUPANCY_OBS_ID = "occupancyObsId";
const FOREGROUND_REPORTS = "foregroundReports";
const BACKGROUND_REPORTS = "backgroundReports";

export default function N42Detail(props: { event: EventTableData }) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [fileDataMap, setFileDataMap] = useState<Map<string, N42FileData>>(new Map());
    const [currentPage, setCurrentPage] = useState(0);

    // Each N42 observation carries the encoded id of the occupancy it belongs
    // to (set in N42Output.parseN42Message at publish time). We filter both the
    // historical fetch and the live subscription against the current event's
    // occupancy obs id so the viewer only displays N42 data for THIS occupancy.
    // Depend on the primitive occupancyObsId/laneId rather than the event
    // object reference: AdjudicationDetail lazily mutates
    // props.event.occupancyObsId after an async lookup for events that were
    // live when opened, and that mutation does not change the prop reference.
    // Depending on the primitives lets fetchN42 and the live subscription
    // both re-run once the id becomes available.
    const targetOccupancyObsId = props.event.occupancyObsId;
    const currentLaneId = props.event.laneId;

    const fetchN42 = useCallback(async() => {
        // Reset on event change so we don't show stale data from another event.
        setFileDataMap(new Map());
        setCurrentPage(0);

        if (!targetOccupancyObsId) {
            console.debug("[N42Detail] skipping fetch: occupancyObsId not yet resolved");
            return;
        }

        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLaneId);

        const n42Stream = currLaneEntry.findDataStreamByObsProperty(N42_REPORT_DEF);
        if (!n42Stream) {
            console.warn("No N42 datastream found for this lane");
            return;
        }

        // Paginate the lane's N42 stream and accumulate any observation whose
        // occupancyObsId matches this event. Mirrors WebIdAnalysis.tsx.
        const matched = new Map<string, N42FileData>();
        let query = await n42Stream.searchObservations(undefined, 100);

        let scanned = 0;
        while (query.hasNext()) {
            const obsCollection = await query.nextPage();

            for (const obs of obsCollection) {
                scanned++;
                const data = obs.result;
                if (!data) continue;

                if (data[OCCUPANCY_OBS_ID] !== targetOccupancyObsId) continue;

                const foreground: N42Report[] = data[FOREGROUND_REPORTS] ?? [];
                const background: N42Report[] = data[BACKGROUND_REPORTS] ?? [];
                if (foreground.length === 0 && background.length === 0) continue;

                const msgFileName: string | undefined = data[FILENAME];
                const key = msgFileName && msgFileName.length > 0 ? msgFileName : randomUUID();

                matched.set(key, {
                    fileName: msgFileName ?? "",
                    foregroundReports: foreground,
                    backgroundReports: background,
                });
            }
        }

        console.debug(`[N42Detail] fetch complete: scanned=${scanned} matched=${matched.size} for occupancyObsId=${targetOccupancyObsId}`);

        if (matched.size > 0) {
            setFileDataMap(matched);
        }
    }, [targetOccupancyObsId, currentLaneId, laneMapRef]);

    useEffect(() => {
        if (props.event) fetchN42();
    }, [fetchN42]);

    useEffect(() => {
        if (!targetOccupancyObsId) {
            console.debug("[N42Detail] skipping live subscribe: occupancyObsId not yet resolved");
            return;
        }

        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLaneId);

        const n42Stream = currLaneEntry.findDataStreamByObsProperty(N42_REPORT_DEF);
        if (!n42Stream) {
            console.warn("No N42 datastream found for this lane");
            return;
        }

        const n42Source = currLaneEntry.datasourcesRealtime?.find((ds: any) => {
            const parts = ds.properties.resource?.split("/");
            return parts && parts[2] === n42Stream.properties.id;
        });
        if (!n42Source) {
            console.warn("No N42 data source found for this lane");
            return;
        }

        const handleObservations = (msg: any) => {
            const data = msg.values?.[0]?.data;
            if (!data) return;

            // Only accept live N42 observations that belong to this event's
            // occupancy. A user uploading a file mid-view will produce an N42
            // observation with this occupancy's obs id and so will appear here.
            if (data[OCCUPANCY_OBS_ID] !== targetOccupancyObsId) return;

            const foreground: N42Report[] = data[FOREGROUND_REPORTS] ?? [];
            const background: N42Report[] = data[BACKGROUND_REPORTS] ?? [];
            if (foreground.length === 0 && background.length === 0) return;

            const msgFileName: string | undefined = data[FILENAME];
            const key = msgFileName && msgFileName.length > 0 ? msgFileName : randomUUID();

            setFileDataMap(prev => {
                const next = new Map(prev);
                next.set(key, {
                    fileName: msgFileName ?? "",
                    foregroundReports: foreground,
                    backgroundReports: background,
                });
                return next;
            });
        };

        n42Source.subscribe(handleObservations, [EventType.DATA]);

        try {
            n42Source.connect();
        } catch (err) {
            console.error("Error connecting n42 source:", err);
        }

    }, [targetOccupancyObsId, currentLaneId, laneMapRef]);

    const fileEntries = Array.from(fileDataMap.values());

    if (fileEntries.length === 0) {
        return null;
    }

    const activeFile = fileEntries[currentPage];

    const handlePrevPage = () => {
        setCurrentPage(prev => (prev > 0 ? prev - 1 : 0));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => (prev < fileEntries.length - 1 ? prev + 1 : prev));
    };

    return (
        <Grid container spacing={2} sx={{width: '100%'}}>
            <Grid item xs={12}>
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    <IconButton onClick={handlePrevPage} disabled={currentPage === 0}>
                        <NavigateBeforeIcon/>
                    </IconButton>
                    <Box sx={{textAlign: 'center'}}>
                        <Typography variant="h5">N42 Report</Typography>
                        <Typography variant="subtitle1">{activeFile.fileName}</Typography>
                        {fileEntries.length > 1 && (
                            <Typography variant="caption">
                                {currentPage + 1} / {fileEntries.length}
                            </Typography>
                        )}
                    </Box>
                    <IconButton onClick={handleNextPage} disabled={currentPage >= fileEntries.length - 1}>
                        <NavigateNextIcon/>
                    </IconButton>
                </Box>
            </Grid>

            <Grid item xs>
                <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                    {activeFile.foregroundReports.length > 0 && (
                        <>
                            <Grid item xs={6}>
                                <N42ChartPlayback
                                    reports={activeFile.foregroundReports}
                                    title={"Foreground Linear Spectrum"}
                                    chartId={`n42-chart-foreground-${currentPage}`}
                                    yValue={"linearSpectrum"}
                                />
                            </Grid>
                        </>
                    )}


                    {activeFile.backgroundReports.length > 0 && (
                        <>
                            <Grid item xs={6}>
                                <N42ChartPlayback
                                    reports={activeFile.backgroundReports}
                                    title={"Background Linear Spectrum"}
                                    chartId={`n42-chart-background-${currentPage}`}
                                    yValue={"linearSpectrum"}
                                />
                            </Grid>
                        </>
                    )}


                </Grid>
            </Grid>
        </Grid>
    );
}
