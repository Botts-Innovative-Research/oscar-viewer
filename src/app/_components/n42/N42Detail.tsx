import {Grid, Typography} from "@mui/material";
import React, {useContext, useEffect, useState} from "react";
import NuclideAnalysisTable from "@/app/_components/n42/NuclideAnalysisTable";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {N42_REPORT_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import N42ChartPlayback from "@/app/_components/n42/N42ChartPlayback";

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

// this will be under adjudications when they upload a file
export default function N42Detail(props: { event: EventTableData; }) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    const [foregroundReports, setForegroundReports] = useState<N42Report[]>([]);
    const [backgroundReports, setBackgroundReports] = useState<N42Report[]>([]);

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

            const reports: N42Report[] = data["Foreground Reports"] ?? [];
            console.log(`Received ${reports.length} foreground reports`);
            if (reports.length > 0) {
                setForegroundReports(reports);
            }

            const bkgReports = data["Background Reports"] ?? [];
            console.log('bkg reports', bkgReports)

            console.log(`Received ${bkgReports.length} background reports`);
            if (bkgReports.length > 0) {
                setBackgroundReports(bkgReports);
            }
        };

        n42Source.subscribe(handleObservations, [EventType.DATA]);

        try {
            n42Source.connect();
        } catch (err) {
            console.error("Error connecting n42 source:", err);
        }

    }, [props.event]);

    return (
        <Grid container spacing={2} sx={{width: '100%'}}>
            <Grid item xs={12}>
                <Typography variant="h4">N42</Typography>
            </Grid>

                <Grid item xs>
                    <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                        {foregroundReports.length > 0 && (
                            <Grid item xs>
                                <N42ChartPlayback
                                    reports={foregroundReports}
                                    title={"Foreground Linear Spectrum"}
                                    chartId={"n42-chart-foreground"}
                                    yValue={"linearSpectrum"}
                                />
                            </Grid>
                            )}
                        {backgroundReports.length > 0 && (
                            <Grid item xs>
                                <N42ChartPlayback
                                    reports={backgroundReports}
                                    title={"Background Linear Spectrum"}
                                    chartId={"n42-chart-background"}
                                    yValue={"linearSpectrum"}
                                />
                            </Grid>
                            )}
                    </Grid>
                </Grid>

            {/*this is a repeat of the webid analysis isotopes block */}
            {/*<Grid item xs={12}>*/}
            {/*    <NuclideAnalysisTable datasource={undefined}/>*/}
            {/*</Grid>*/}
        </Grid>
    );
}
