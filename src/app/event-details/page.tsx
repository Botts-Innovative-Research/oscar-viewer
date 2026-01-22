"use client";

import {Box, Button, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";
import MiscTable from "../_components/event-details/MiscTable";
import {useSelector} from "react-redux";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import AdjudicationDetail from "@/app/_components/adjudication/AdjudicationDetail";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {selectEventPreview} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {PictureAsPdfRounded} from "@mui/icons-material";
import {useReactToPrint} from "react-to-print";
import EventMedia from "../_components/event-preview/EventMedia";
import CircularProgress from "@mui/material/CircularProgress";


export default function EventDetailsPage() {

    const eventPreview = useSelector(selectEventPreview);
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const [localDSMap, setLocalDSMap] = useState<Map<string, typeof ConSysApi[]>>(new Map<string, typeof ConSysApi[]>());
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);

    const [gammaDatasources, setGammaDatasources] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDatasources] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDatasources] = useState<typeof ConSysApi[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);
    const docTitle = eventPreview.eventData ? `eventdetails-${eventPreview.eventData.laneId}-${eventPreview.eventData.occupancyObsId}-${eventPreview.eventData.startTime}-${eventPreview.eventData.endTime}` : 'eventdetails';


    const collectDataSources = useCallback(async() => {
        if(!eventPreview.eventData?.laneId || !laneMapRef.current) return;

        let currentLane = eventPreview.eventData.laneId;

        const currLaneEntry: LaneMapEntry = laneMapRef.current.get(currentLane);
        if (!currLaneEntry) {
            console.error("LaneMapEntry not found for:", currentLane);
            return;
        }

        // @ts-ignore
        let tempDSMap: Map<string, typeof ConSysApi[]>;

        let datasources = await currLaneEntry.getDatastreamsForEventDetail(eventPreview.eventData.startTime, eventPreview.eventData.endTime);

        setLocalDSMap(datasources);
        tempDSMap = datasources;


        const updatedGamma = tempDSMap.get("gamma") || [];
        const updatedNeutron = tempDSMap.get("neutron") || [];
        const updatedThreshold = tempDSMap.get("gammaTrshld") || [];

        setGammaDatasources(updatedGamma);
        setNeutronDatasources(updatedNeutron);
        setThresholdDatasources(updatedThreshold);

        setDatasourcesReady(true);

    }, [eventPreview, laneMapRef]);


    useEffect(() => {
        async function callCollectDatasources(){
            await collectDataSources();
        }

        if(laneMapRef.current && eventPreview) {
            callCollectDatasources();
        }
    }, [eventPreview, laneMapRef.current]);


    useEffect(() => {
        gammaDatasources.forEach(ds => ds.connect());
        neutronDatasources.forEach(ds => ds.connect());
        thresholdDatasources.forEach(ds => ds.connect());

        return () => {
            gammaDatasources.forEach(ds => ds.disconnect());
            neutronDatasources.forEach(ds => ds.disconnect());
            thresholdDatasources.forEach(ds => ds.disconnect());
        }
    }, [datasourcesReady]);

    const reactToPrintFn = useReactToPrint({
        contentRef: contentRef,
        documentTitle: docTitle,
        onAfterPrint: () => console.log('Successfully saved as a PDF.')
    });

    return (
        <Grid container spacing={2} width={"100%"} sx={{ minWidth: 0 }}>
            <Grid item container xs={12} sx={{ minWidth: 0, gap: 2 }}>   

                {/* HEADER */}
                <Grid item container xs={12} spacing={2} justifyContent={"space-between"}>
                    <Grid item container spacing={2} xs alignItems={"center"}>
                        <Grid item>
                            <BackButton/>
                        </Grid>
                        <Grid item>
                            <Typography variant="h4">Event Details</Typography>
                        </Grid>
                    </Grid>
                    <Grid item xs={12} sm={"auto"}>
                        <Button
                            variant="outlined"
                            startIcon={<PictureAsPdfRounded/>}
                            onClick={() => {
                                reactToPrintFn()
                            }}
                        >
                            Export as PDF
                        </Button>
                    </Grid>
                </Grid>
                

                {/* EVENT PREVIEW */}
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{ width: '100%'}}>
                        <DataRow eventData={eventPreview.eventData}/>
                    </Paper>
                </Grid>

                {/* EVENT MEDIA */}
                <Grid item xs={12}>
                    { datasourcesReady ? (
                        <EventMedia
                            selectedNode={laneMapRef.current.get(eventPreview.eventData.laneId).parentNode}
                            datasources={{
                                gamma: gammaDatasources[0],
                                neutron: neutronDatasources[0],
                                threshold: thresholdDatasources[0],
                            }}
                            mode="details"
                            eventData={eventPreview.eventData}
                        />
                        ) :
                        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                            <CircularProgress/>
                        </Box>
                    }
                </Grid>

                {/* MISC TABLE */}
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{width: "100%"}}>
                        <MiscTable currentTime={eventPreview.eventData?.startTime}/>
                    </Paper>
                </Grid>

                {/* ADJUDICATION */}
                <Grid item xs={12}>
                    <Paper variant='outlined' sx={{width: "100%"}}>
                        <AdjudicationDetail event={eventPreview.eventData}/>
                    </Paper>
                </Grid>
                
            </Grid>
        </Grid>
    );
}