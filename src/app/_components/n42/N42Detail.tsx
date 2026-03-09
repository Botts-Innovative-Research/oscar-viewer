import {Box, Grid, Paper, Typography} from "@mui/material";
import React, {useContext, useEffect} from "react";
import N42Chart from "@/app/_components/n42/N42Chart";
import NuclideAnalysisTable from "@/app/_components/n42/NuclideAnalysisTable";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {N42_DEF, WEB_ID_DEF} from "@/lib/data/Constants";
import WebIdAnalysisResult from "@/lib/data/oscar/adjudication/WebId";
import {EventType} from "osh-js/source/core/event/EventType";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import N42ChartPlayback from "@/app/_components/n42/N42ChartPlayback";


// this will be under adjudications when they upload a file
export default function N42Detail(props: { event: EventTableData; }) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;

    // n42 datastream


    useEffect(() => {
        const currentLane = props.event.laneId;
        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);

        let n42Stream = currLaneEntry.findDataStreamByObsProperty(N42_DEF);

        if(!n42Stream) {
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
            const results = msg.values?.[0]?.data;

        }

        n42Source.subscribe(handleObservations, [EventType.DATA]);

        try {
            n42Source.connect();
        } catch (err) {
            console.error("Error connecting n42 source:", err);
        }

    }, [props.event]);

    return(
        <Grid container spacing={2} sx={{ width: '100%' }}>
            <Grid item xs={12}>
                <Typography
                    variant="h4"
                >
                    N42
                </Typography>
            </Grid>
            <Grid item xs>
                <Grid container direction="row" marginTop={2} marginLeft={1} spacing={4}>
                    <Grid item xs>
                        {/*linear*/}
                        {/*<N42Chart laneName={""} datasource={undefined} setChartReady={undefined} title={""} yCurve={""} yValue={""}/>*/}
                        {/*<N42ChartPlayback datastream={} title={} chartId={}/>*/}
                    </Grid>
                    <Grid item xs>
                        {/*compressed*/}
                        {/*<N42Chart laneName={""} datasource={undefined} setChartReady={undefined} title={""} yCurve={""} yValue={""}/>*/}
                    </Grid>
                </Grid>
            </Grid>

            <Grid item xs={12}>
                <NuclideAnalysisTable datasource={undefined}/>
            </Grid>

        </Grid>
    )
}