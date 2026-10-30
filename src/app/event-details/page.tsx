"use client";

import {Alert, Button, Grid, Paper, Stack, Typography} from "@mui/material";
import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import BackButton from "../_components/BackButton";
import DataRow from "../_components/event-details/DataRow";
import MiscTable from "../_components/event-details/MiscTable";
import {useSelector} from "react-redux";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {selectEventPreview, setEventPreview, setLatestGB, setSelectedRowId} from "@/lib/state/EventPreviewSlice";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {PictureAsPdfRounded} from "@mui/icons-material";
import {useReactToPrint} from "react-to-print";
import EventMedia from "../_components/event-preview/EventMedia";
import {useLanguage} from "@/app/contexts/LanguageContext";
import AdjudicationDetail from "../_components/adjudication/AdjudicationDetail";
import SuspenseLoad from "@/app/_components/SuspenseLoad";
import AlarmQrExportButton from "@/app/_components/alarm-transfer/AlarmQrExportButton";
import ShareOccupancyButton from "@/app/_components/event-details/ShareOccupancyButton";
import DailyFileTable from "@/app/_components/event-preview/DailyFileTable";
import {useSharedOccupancy} from "@/app/hooks/useSharedOccupancy";
import {RootState} from "@/lib/state/Store";
import {isThresholdDataStream} from "@/lib/data/oscar/Utilities";
import {getObservations} from "@/app/utils/ChartUtils";
import {useRouter, useSearchParams} from "next/navigation";
import {useAppDispatch} from "@/lib/state/Hooks";
import {setSelectedEvent} from "@/lib/state/EventDataSlice";
import {setEventData} from "@/lib/state/EventDetailsSlice";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    buildEventDetailsHref,
    EventLookupError,
    lookupEventByObservationId,
    normalizeEventObservationId,
    resolveEventObservationId,
} from "@/lib/data/oscar/EventLookup";

type LookupState = "idle" | "loading" | "ready" | "not-found" | "ambiguous" | "unavailable";
type LiveIdentityState = "idle" | "resolving" | "failed";

const LIVE_IDENTITY_LOOKUP_ATTEMPTS = 5;
const LIVE_IDENTITY_RETRY_DELAY_MS = 1000;
const LIVE_IDENTITY_REQUEST_TIMEOUT_MS = 2500;

function waitForLiveIdentityRetry(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            signal.removeEventListener("abort", handleAbort);
            resolve();
        }, LIVE_IDENTITY_RETRY_DELAY_MS);
        const handleAbort = () => {
            window.clearTimeout(timeoutId);
            reject(new DOMException("The event identity lookup was cancelled.", "AbortError"));
        };
        signal.addEventListener("abort", handleAbort, {once: true});
    });
}


export default function EventDetailsPage() {

    const eventPreview = useSelector(selectEventPreview);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const {laneMapRef, laneMapReady, readyLaneNames, scopedHref} = useContext(DataSourceContext);
    const sharedRequested = searchParams.has("id");
    const shared = useSharedOccupancy(
        searchParams.get("id"),
        searchParams.get("node"),
        nodes,
        laneMapRef.current,
        laneMapReady,
    );
    const eventIdValues = searchParams.getAll("eventId");
    const nodeIdValues = searchParams.getAll("nodeId");
    const lookupRequested = !sharedRequested && eventIdValues.length > 0;
    const lookupQueryMalformed = eventIdValues.length !== 1 || nodeIdValues.length > 1;
    const requestedEventId = eventIdValues.length === 1 ? eventIdValues[0] : "";
    const requestedNodeId = nodeIdValues.length === 1 ? nodeIdValues[0] : null;
    const [resolvedEvent, setResolvedEvent] = useState<EventTableData | null>(null);
    const [lookupState, setLookupState] = useState<LookupState>(lookupRequested ? "loading" : "idle");
    const [liveIdentityState, setLiveIdentityState] = useState<LiveIdentityState>("idle");
    const [liveIdentityRetryKey, setLiveIdentityRetryKey] = useState(0);
    const resolvedIdentityRef = useRef<{eventId: string; nodeId: string} | null>(null);
    const eventData = sharedRequested
        ? shared.event
        : lookupRequested
            ? resolvedEvent
            : eventPreview.eventData;
    const laneReady = Boolean(eventData?.laneId && readyLaneNames.has(eventData.laneId));
    const laneEntry = eventData?.laneId ? laneMapRef.current?.get(eventData.laneId) : undefined;
    const [datasourcesReady, setDatasourcesReady] = useState<boolean>(false);
    const [loadedEvent, setLoadedEvent] = useState<typeof eventData>(null);
    const [dataSourceError, setDataSourceError] = useState(false);

    const [gammaDatasources, setGammaDatasources] = useState<typeof ConSysApi[]>([]);
    const [neutronDatasources, setNeutronDatasources] = useState<typeof ConSysApi[]>([]);
    const [thresholdDatasources, setThresholdDatasources] = useState<typeof ConSysApi[]>([]);

    const contentRef = useRef<HTMLDivElement>(null);
    const docTitle = eventPreview.eventData ? `eventdetails-${eventPreview.eventData.laneId}-${eventPreview.eventData.occupancyObsId}-${eventPreview.eventData.startTime}-${eventPreview.eventData.endTime}` : 'eventdetails';

    const { t } = useLanguage();

    useEffect(() => {
        if (!sharedRequested) return;
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
    }, [eventData, laneEntry, sharedRequested, dispatch]);

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
        void collect();
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
                            {laneEntry && <ShareOccupancyButton key={`${eventData.id}:share`} event={eventData} lane={laneEntry}/>}
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

                {sharedRequested && shared.loading ? (
                    <Grid item xs={12}><SuspenseLoad /></Grid>
                ) : sharedRequested && shared.error ? (
                    <Grid item xs={12}>
                        <Alert severity="error" action={<Button onClick={shared.retry}>{t("retry")}</Button>}>
                            {t(shared.error)}
                        </Alert>
                    </Grid>
                ) : lookupRequested && (lookupState === "idle" || lookupState === "loading") ? (
                    <Grid item xs={12}>
                        <Alert severity="info" data-testid="event-lookup-loading">
                            {t("eventLookupLoading", {
                                uuid: requestedEventId.trim().slice(0, 128) || t("unknown"),
                            })}
                        </Alert>
                    </Grid>
                ) : lookupRequested && lookupState === "not-found" ? (
                    <Grid item xs={12}>
                        <Alert severity="warning" data-testid="event-lookup-not-found">
                            {t("eventLookupNotFound", {
                                uuid: requestedEventId.trim().slice(0, 128) || t("unknown"),
                            })}
                        </Alert>
                    </Grid>
                ) : lookupRequested && lookupState === "ambiguous" ? (
                    <Grid item xs={12}>
                        <Alert severity="warning" data-testid="event-lookup-ambiguous">
                            {t("eventLookupAmbiguous", {
                                uuid: requestedEventId.trim().slice(0, 128) || t("unknown"),
                            })}
                        </Alert>
                    </Grid>
                ) : lookupRequested && lookupState === "unavailable" ? (
                    <Grid item xs={12}>
                        <Alert severity="error" data-testid="event-lookup-unavailable">
                            {t("eventLookupUnavailable", {
                                uuid: requestedEventId.trim().slice(0, 128) || t("unknown"),
                            })}
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
                        <Grid item container xs={12} spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Paper variant='outlined' sx={{ height: '100%'}}>
                                    <MiscTable key={eventData.id} eventData={eventData} currentTime={eventData.startTime}/>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Paper variant='outlined' sx={{ height: '100%'}}>
                                    <DailyFileTable event={eventData}/>
                                </Paper>
                            </Grid>
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
