"use client";

import {Alert, Button, Grid, Paper, Typography} from "@mui/material";
import React, {useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";
import MiscTable from "../_components/event-details/MiscTable";
import {useSelector} from "react-redux";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {selectEventPreview, setLatestGB} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {PictureAsPdfRounded} from "@mui/icons-material";
import {useReactToPrint} from "react-to-print";
import EventMedia from "../_components/event-preview/EventMedia";
import {useLanguage} from "@/app/contexts/LanguageContext";
import AdjudicationDetail from "../_components/adjudication/AdjudicationDetail";
import SuspenseLoad from "@/app/_components/SuspenseLoad";
import {useSearchParams} from "next/navigation";
import {RootState} from "@/lib/state/Store";
import {useSharedOccupancy} from "@/app/hooks/useSharedOccupancy";
import ShareOccupancyButton from "@/app/_components/event-details/ShareOccupancyButton";
import {useAppDispatch} from "@/lib/state/Hooks";
import {isThresholdDataStream} from "@/lib/data/oscar/Utilities";
import {getObservations} from "@/app/utils/ChartUtils";


export default function EventDetailsPage() {

    const eventPreview = useSelector(selectEventPreview);
    const dispatch = useAppDispatch();
    const params = useSearchParams();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const {laneMapRef, laneMapReady, readyLaneNames} = useContext(DataSourceContext);
    const shared = useSharedOccupancy(params.get("id"), params.get("node"), nodes, laneMapRef.current, laneMapReady);
    // A URL resource takes precedence over a previously selected/persisted occupancy.
    const eventData = params.has("id") ? shared.event : eventPreview.eventData;
    const laneReady = Boolean(eventData?.laneId && readyLaneNames.has(eventData.laneId));
    const laneEntry = eventData?.laneId ? laneMapRef.current?.get(eventData.laneId) : undefined;
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const [loadedEvent, setLoadedEvent] = useState<typeof eventData>(null);
    const [dataSourceError, setDataSourceError] = useState(false);

    const [gammaDatasources, setGammaDatasources] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDatasources] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDatasources] = useState<typeof ConSysApi[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);
    const docTitle = eventData ? `eventdetails-${eventData.laneId}-${eventData.occupancyObsId}-${eventData.startTime}-${eventData.endTime}` : 'eventdetails';

    const { t } = useLanguage();

    useEffect(() => {
        if (!params.has("id")) return;
        let active = true;
        dispatch(setLatestGB(null));
        const threshold = laneEntry?.datastreams.find((stream: any) => isThresholdDataStream(stream)
            && stream.properties["system@id"] === eventData?.rpmSystemId);
        if (threshold && eventData) {
            getObservations(eventData.startTime, eventData.endTime, threshold).then(value => {
                if (active) dispatch(setLatestGB(value ?? null));
            }).catch(error => console.error("Failed to load shared occupancy background:", error));
        }
        return () => { active = false; };
    }, [eventData, laneEntry, params, dispatch]);

    useEffect(() => {
        setDatasourcesReady(false);
        setDataSourceError(false);
        setGammaDatasources([]);
        setNeutronDatasources([]);
        setThresholdDatasources([]);
        let cancelled = false;
        if (!eventData || !laneEntry || !laneReady) return;
        const collect = async () => {
            try {
                const datasources = await laneEntry.getDatastreamsForEventDetail(eventData.startTime, eventData.endTime);
                if (cancelled) return;

                const updatedGamma = datasources.get("gamma") || [];
                const updatedNeutron = datasources.get("neutron") || [];
                const updatedThreshold = datasources.get("gammaTrshld") || [];

                setGammaDatasources(updatedGamma);
                setNeutronDatasources(updatedNeutron);
                setThresholdDatasources(updatedThreshold);
                setLoadedEvent(eventData);

                setDatasourcesReady(true);
            } catch (error) {
                if (cancelled) return;
                console.error("Failed to load event detail data sources:", error);
                setDataSourceError(true);
            }
        };
        collect();
        return () => { cancelled = true; };
    }, [eventData, laneEntry, laneReady]);


    useEffect(() => {
        gammaDatasources.forEach(ds => ds.connect());
        neutronDatasources.forEach(ds => ds.connect());
        thresholdDatasources.forEach(ds => ds.connect());

        return () => {
            gammaDatasources.forEach(ds => ds.disconnect());
            neutronDatasources.forEach(ds => ds.disconnect());
            thresholdDatasources.forEach(ds => ds.disconnect());
        }
    }, [gammaDatasources, neutronDatasources, thresholdDatasources]);

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
                        {laneEntry && <ShareOccupancyButton key={`${eventData.id}:share`} event={eventData} lane={laneEntry}/>}
                    </Grid>}
                    {eventData && <Grid item xs={12} sm={"auto"}>
                        <Button
                            variant="outlined"
                            startIcon={<PictureAsPdfRounded/>}
                            onClick={() => {
                                reactToPrintFn()
                            }}
                        >
                            {t('exportAsPdf')}
                        </Button>
                    </Grid>}
                </Grid>

                {params.has("id") && shared.loading ? (
                    <Grid item xs={12}><SuspenseLoad /></Grid>
                ) : params.has("id") && shared.error ? (
                    <Grid item xs={12}>
                        <Alert severity="error" action={<Button onClick={shared.retry}>{t("retry")}</Button>}>
                            {t(shared.error)}
                        </Alert>
                    </Grid>
                ) : !eventData ? (
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
                            ) : datasourcesReady && loadedEvent === eventData ? (
                                <EventMedia
                                    key={eventData.id}
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
                                <MiscTable key={eventData.id} eventData={eventData}/>
                            </Paper>
                        </Grid>

                        {/* ADJUDICATION */}
                        <Grid item xs={12}>
                            <AdjudicationDetail key={eventData.id} event={eventData}/>
                        </Grid>
                    </>
                )}
            </Grid>
        </Grid>
    );
}
