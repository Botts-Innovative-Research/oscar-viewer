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
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";

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

export default function N42Detail(props: { event: EventTableData; uploadedFiles?: string[] }) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [fileDataMap, setFileDataMap] = useState<Map<string, N42FileData>>(new Map());
    const [currentPage, setCurrentPage] = useState(0);

    const fetchN42 = useCallback(async() => {
        // fetch observations between start and endtime and populate chart u can name the filename just like 1 - x
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        const n42Stream = currLaneEntry.findDataStreamByObsProperty(N42_REPORT_DEF);
        if (!n42Stream) {
            console.warn("No N42 datastream found for this lane");
            return;
        }

        let query = await n42Stream.searchObservations(new ObservationFilter({resultTime: `${props.event.startTime}/${props.event.endTime}`}), 100);

        while (query.hasNext()) {
            let obsCollection = await query.nextPage();

            for (const obs of obsCollection) {
                const data = obs.result;
                if (!data) continue;

                const msgFileName: string = data["fileName"];
                const foreground: N42Report[] = data["Foreground Reports"] ?? [];
                const background: N42Report[] = data["Background Reports"] ?? [];

                if (foreground.length === 0 && background.length === 0) continue;

                setFileDataMap(prev => {
                    const next = new Map(prev);
                    next.set(msgFileName ?? "none -" + randomUUID(), {
                        fileName: msgFileName ?? "No file name",
                        foregroundReports: foreground,
                        backgroundReports: background,
                    });
                    return next;
                });
            }
        }

    }, [props.event]);

    useEffect(() => {
        if (props.event) fetchN42();
    }, [props.event, fetchN42]);

    useEffect(() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

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

            console.log('data', data);

            const msgFileName: string = data["fileName"];
            // const matchedFile = props.uploadedFiles.find(fp => msgFileName?.endsWith(fp));
            // if (!matchedFile) {
            //     console.warn("no matched file name")
            //     return;
            // }

            const foreground: N42Report[] = data["Foreground Reports"] ?? [];
            const background: N42Report[] = data["Background Reports"] ?? [];

            if (foreground.length === 0 && background.length === 0) return;
            setFileDataMap(prev => {
                const next = new Map(prev);
                next.set(msgFileName ?? "none -" + randomUUID(), {
                    fileName: msgFileName ?? "No file name",
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

    }, [props.event.adjudicatedData, props.uploadedFiles]);

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
                            {/*<Grid item xs={6}>*/}
                            {/*    <N42ChartPlayback*/}
                            {/*        reports={activeFile.foregroundReports}*/}
                            {/*        title={"Foreground Linear Spectrum"}*/}
                            {/*        chartId={`n42-chart-foreground-cmp-${currentPage}`}*/}
                            {/*        yValue={"compressedSpectrum"}*/}
                            {/*    />*/}
                            {/*</Grid>*/}
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
                            {/*<Grid item xs={6}>*/}
                            {/*    <N42ChartPlayback*/}
                            {/*        reports={activeFile.backgroundReports}*/}
                            {/*        title={"Background Compressed Spectrum"}*/}
                            {/*        chartId={`n42-chart-background-cpm-${currentPage}`}*/}
                            {/*        yValue={"compressedSpectrum"}*/}
                            {/*    />*/}
                            {/*</Grid>*/}
                        </>
                    )}


                </Grid>
            </Grid>
        </Grid>
    );
}
