"use client";

import {Alert, Button, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";
import MiscTable from "../_components/event-details/MiscTable";
import {useSelector} from "react-redux";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {selectEventPreview} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {PictureAsPdfRounded} from "@mui/icons-material";
import {useReactToPrint} from "react-to-print";
import EventMedia from "../_components/event-preview/EventMedia";
import {useLanguage} from "@/app/contexts/LanguageContext";
import AdjudicationDetail from "../_components/adjudication/AdjudicationDetail";
import SuspenseLoad from "@/app/_components/SuspenseLoad";
import AlarmQrExportButton from "@/app/_components/alarm-transfer/AlarmQrExportButton";


export default function EventDetailsPage() {

    const eventPreview = useSelector(selectEventPreview);
    const eventData = eventPreview.eventData;
    const {laneMapRef, laneMapReady, readyLaneNames} = useContext(DataSourceContext);
    const laneReady = Boolean(eventData?.laneId && readyLaneNames.has(eventData.laneId));
    const laneEntry = eventData?.laneId ? laneMapRef.current?.get(eventData.laneId) : undefined;
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const [dataSourceError, setDataSourceError] = useState(false);

    const [gammaDatasources, setGammaDatasources] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDatasources] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDatasources] = useState<typeof ConSysApi[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);
    const docTitle = eventPreview.eventData ? `eventdetails-${eventPreview.eventData.laneId}-${eventPreview.eventData.occupancyObsId}-${eventPreview.eventData.startTime}-${eventPreview.eventData.endTime}` : 'eventdetails';

    const { t } = useLanguage();

    const collectDataSources = useCallback(async() => {
        if(!eventData || !laneEntry) return;

        setDatasourcesReady(false);
        setDataSourceError(false);

        try {
            const datasources = await laneEntry.getDatastreamsForEventDetail(eventData.startTime, eventData.endTime);

            const updatedGamma = datasources.get("gamma") || [];
            const updatedNeutron = datasources.get("neutron") || [];
            const updatedThreshold = datasources.get("gammaTrshld") || [];

            setGammaDatasources(updatedGamma);
            setNeutronDatasources(updatedNeutron);
            setThresholdDatasources(updatedThreshold);

            setDatasourcesReady(true);
        } catch (error) {
            console.error("Failed to load event detail data sources:", error);
            setDataSourceError(true);
        }

    }, [eventData, laneEntry]);


    useEffect(() => {
        async function callCollectDatasources(){
            await collectDataSources();
        }

        if(laneReady && laneEntry && eventData) {
            callCollectDatasources();
        }
    }, [collectDataSources, eventData, laneEntry, laneReady]);


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
        <Grid container spacing={2} sx={{ width: "100%", height: "auto" }} ref={contentRef}>
            <Grid item container xs={12} lg={12} sx={{ gap: 2 }}>

                {/* HEADER */}
                <Grid item container xs={12} spacing={2} justifyContent={"space-between"}>
                    <Grid item container spacing={2} xs alignItems={"center"}>
                        <Grid item>
                            <BackButton/>
                        </Grid>
                        <Grid item>
                            <Typography variant="h4">
                                { t('eventDetails') }
                            </Typography>
                        </Grid>
                    </Grid>
                    {eventData && <Grid item xs={12} sm={"auto"}>
                        <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                            {laneEntry && <AlarmQrExportButton event={eventData} lane={laneEntry}/>}
                            <Button
                                variant="outlined"
                                startIcon={<PictureAsPdfRounded/>}
                                onClick={() => {
                                    reactToPrintFn()
                                }}
                            >
                                {t('exportAsPdf')}
                            </Button>
                        </Stack>
                    </Grid>}
                </Grid>

                {!eventData ? (
                    <Grid item xs={12}>
                        <Alert severity="warning">{t('eventDetailsUnavailable')}</Alert>
                    </Grid>
                ) : !laneReady && !laneMapReady ? (
                    <Grid item xs={12}><SuspenseLoad /></Grid>
                ) : !laneEntry ? (
                    <Grid item xs={12}>
                        <Alert severity="error">{t('eventLaneUnavailable', {lane: eventData.laneId})}</Alert>
                    </Grid>
                ) : (
                    <>
                        {/* EVENT PREVIEW */}
                        <Grid item xs={12}>
                            <Paper variant='outlined'>
                                <DataRow eventData={eventData}/>
                            </Paper>
                        </Grid>

                        {/* EVENT MEDIA */}
                        <Grid item xs={12}>
                            {dataSourceError ? (
                                <Alert severity="error">{t('eventDataLoadFailed')}</Alert>
                            ) : datasourcesReady ? (
                                <EventMedia
                                    selectedNode={laneEntry.parentNode}
                                    datasources={{
                                        gamma: gammaDatasources[0],
                                        neutron: neutronDatasources[0],
                                        threshold: thresholdDatasources[0],
                                    }}
                                    mode="details"
                                    eventData={eventData}
                                    laneMap={laneMapRef.current}
                                />
                            ) : <SuspenseLoad />}
                        </Grid>

                        {/* MISC TABLE */}
                        <Grid item xs={12}>
                            <Paper variant='outlined'>
                                <MiscTable currentTime={eventData.startTime}/>
                            </Paper>
                        </Grid>

                        {/* ADJUDICATION */}
                        <Grid item xs={12}>
                            <AdjudicationDetail event={eventData}/>
                        </Grid>
                    </>
                )}
            </Grid>
        </Grid>
    );
}
