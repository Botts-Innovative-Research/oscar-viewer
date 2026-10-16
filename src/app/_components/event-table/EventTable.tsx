"use client";

import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {Alert, Box, Snackbar} from "@mui/material";
import {useSelector} from "react-redux";
import {
    DataGrid,
    GRID_CHECKBOX_SELECTION_FIELD,
    GridActionsCellItem,
    GridCellParams,
    gridClasses,
    GridColDef,
    GridRowParams,
    GridRowSelectionModel,
} from "@mui/x-data-grid";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import {EventType} from "osh-js/source/core/event/EventType";
import {useRouter} from "next/dist/client/components/navigation";

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {isOccupancyDataStream, isThresholdDataStream} from "@/lib/data/oscar/Utilities";
import {convertToMap} from "@/app/utils/Utils";
import {OCCUPANCY_PILLAR_DEF} from "@/lib/data/Constants";
import {getObservations} from "@/app/utils/ChartUtils";
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    selectSelectedRowId,
    setEventPreview,
    setLatestGB,
    setSelectedRowId,
} from "@/lib/state/EventPreviewSlice";
import {
    selectAdjudicatedEventId,
    setAdjudicatedEventId,
    setSelectedEvent,
} from "@/lib/state/EventDataSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {NotificationService, NotificationTemplates} from "../notifications/NotificationService";
import {getDataGridLocaleText, getIntlLocale} from "@/app/utils/LocaleUtils";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import CustomToolbar from "@/app/_components/CustomToolbar";
import NestedEventFilterDialog from "@/app/_components/event-table/NestedEventFilterDialog";
import BulkAdjudicationDialog, {BulkAdjudicationSummary} from "@/app/_components/event-table/BulkAdjudicationDialog";
import {
    combineServerFilters,
    compileEventFilterForLane,
    countEventFilterRules,
    createEventFilterGroup,
    EventFilterGroup,
    eventMatchesFilter,
    eventSelectionKey,
} from "@/lib/data/oscar/EventFilter";
import {
    adjudicateEvents,
    BulkAdjudicationOutcome,
    BulkAdjudicationValues,
    runWithConcurrency,
} from "@/lib/data/oscar/BulkAdjudication";
import {
    buildObservationCountParams,
    buildObservationPageParams,
} from "@/lib/data/oscar/EventQuery";
import {
    buildEventDetailsHref,
    createEventFromOccupancyObservation,
    EventLookupError,
    resolveEventObservationId,
} from "@/lib/data/oscar/EventLookup";

interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "lanelog";
    viewSecondary?: boolean;
    currentLane?: string;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
    laneMap: Map<string, LaneMapEntry>;
    setEvents?: unknown;
}

interface QueryPlan {
    key: string;
    node: LaneMapEntry["parentNode"];
    datastreamIds: string[];
    filter: string;
}

const PAGE_SIZE = 15;
const BULK_FETCH_SIZE = 250;
const REALTIME_ID_RESOLUTION_TIMEOUT_MS = 12_000;
const REALTIME_ID_LOOKUP_REQUEST_TIMEOUT_MS = 1_500;
export const REALTIME_ID_RETRY_DELAYS_MS = [250, 500, 1_000, 2_000, 3_000] as const;

type RealtimeEventIdResolver = typeof resolveEventObservationId;
type RealtimeEventHandler = (message: any) => void;

/**
 * OSH's public datasource wrapper exposes subscribe(), but not unsubscribe().
 * The listener registry lives on the wrapped realtime datasource. Remove the
 * exact callback there so a filter change cannot leave a stale event handler
 * feeding rows into the table.
 */
export function removeRealtimeEventSubscription(
    source: any,
    handler: RealtimeEventHandler,
    eventType: string = EventType.DATA,
): void {
    const maps = [
        source?.eventSubscriptionMap,
        source?.timeSeriesDataSource?.eventSubscriptionMap,
    ].filter((value, index, values) => value && values.indexOf(value) === index);

    maps.forEach(subscriptionMap => {
        const listeners = subscriptionMap[eventType];
        if (!Array.isArray(listeners)) return;
        for (let index = listeners.length - 1; index >= 0; index--) {
            if (listeners[index] === handler) listeners.splice(index, 1);
        }
    });
}

function cloneEventWithObservationId(event: EventTableData, occupancyObsId: string): EventTableData {
    return Object.assign(
        Object.create(Object.getPrototypeOf(event)),
        event,
        {occupancyObsId},
    );
}

function waitForRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
            return;
        }

        const timeout = window.setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, milliseconds);
        const onAbort = () => {
            window.clearTimeout(timeout);
            reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, {once: true});
    });
}

/**
 * Gives a freshly received event a short window to acquire its durable REST
 * resource ID. The original event is returned after bounded failures so alarm
 * notification delivery never depends on persistence timing.
 */
export async function resolveRealtimeEventForNotification(
    event: EventTableData,
    lane: LaneMapEntry,
    signal?: AbortSignal,
    resolver: RealtimeEventIdResolver = resolveEventObservationId,
    retryDelays: readonly number[] = REALTIME_ID_RETRY_DELAYS_MS,
): Promise<EventTableData> {
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        try {
            const eventId = await resolver(
                event,
                lane,
                fetch,
                signal,
                REALTIME_ID_LOOKUP_REQUEST_TIMEOUT_MS,
            );
            return cloneEventWithObservationId(event, eventId);
        } catch (error) {
            if (signal?.aborted) return event;
            const retryable = error instanceof EventLookupError
                && (error.code === "not-found" || error.code === "unavailable");
            if (!retryable || attempt >= retryDelays.length) return event;
            try {
                await waitForRetry(retryDelays[attempt], signal);
            } catch {
                return event;
            }
        }
    }
    return event;
}

const deduplicateEvents = (events: EventTableData[]): EventTableData[] => {
    const result = new Map<string, EventTableData>();
    events.forEach(event => result.set(eventSelectionKey(event), event));
    return Array.from(result.values());
};

export default function EventTable({
    tableMode,
    viewAdjudicated = false,
    laneMap,
    currentLane,
}: TableProps) {
    const selectedRowId = useSelector(selectSelectedRowId);
    const adjudicatedEventId = useSelector(selectAdjudicatedEventId);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {activeViewKey, scopedHref} = useContext(DataSourceContext);
    const {language, t} = useLanguage();
    const locale = getIntlLocale(language);

    const stableLaneMap = useMemo(() => convertToMap(laneMap), [laneMap]);
    const [rows, setRows] = useState<EventTableData[]>([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [paginationModel, setPaginationModel] = useState({page: 0, pageSize: PAGE_SIZE});
    const [pageLoadedTime, setPageLoadedTime] = useState(() => new Date().toISOString());
    const [filter, setFilter] = useState<EventFilterGroup>(() => createEventFilterGroup());
    const [filterDialogOpen, setFilterDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkSelectionError, setBulkSelectionError] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [allFilteredSelected, setAllFilteredSelected] = useState(false);
    const [allFilteredTotal, setAllFilteredTotal] = useState(0);
    const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
    const [postSelectionKeys, setPostSelectionKeys] = useState<Set<string>>(new Set());
    const allFilteredCutoffRef = useRef<string | null>(null);
    const currentPageRef = useRef(0);
    const eventCacheRef = useRef<Map<string, EventTableData>>(new Map());
    const selectedRowIdRef = useRef(selectedRowId);
    const realtimeResolutionJobsRef = useRef<Set<{
        controller: AbortController;
        cancelledByCleanup: boolean;
        timeout: number;
    }>>(new Set());
    const failedBulkRef = useRef<EventTableData[]>([]);
    const countRequestRef = useRef(0);
    const pageRequestRef = useRef(0);

    const nodeOptions = useMemo(() => Array.from(new Set(Array.from(stableLaneMap.values()).map(lane => lane.parentNode.name))).sort(), [stableLaneMap]);
    const laneOptions = useMemo(() => Array.from(new Set(Array.from(stableLaneMap.values()).map(lane => lane.laneName))).sort(), [stableLaneMap]);

    const baseServerFilter = useMemo(() => {
        if (tableMode === "alarmtable")
            return "(gammaAlarm=true OR neutronAlarm=true) AND adjudicatedIdsCount=0";
        return "";
    }, [tableMode]);

    const queryPlans = useMemo<QueryPlan[]>(() => {
        const grouped = new Map<string, QueryPlan>();
        for (const lane of stableLaneMap.values()) {
            if (tableMode === "lanelog" && currentLane && lane.laneName !== currentLane) continue;
            const compiled = compileEventFilterForLane(filter, {
                nodeId: lane.parentNode.id,
                nodeName: lane.parentNode.name,
                laneId: lane.laneName,
            });
            if (compiled === false) continue;
            const serverFilter = combineServerFilters(baseServerFilter, compiled || "");
            const groupKey = `${lane.parentNode.id}\u001f${serverFilter}`;
            let plan = grouped.get(groupKey);
            if (!plan) {
                plan = {key: groupKey, node: lane.parentNode, datastreamIds: [], filter: serverFilter};
                grouped.set(groupKey, plan);
            }
            lane.datastreams
                .filter((stream: typeof DataStream) => isOccupancyDataStream(stream))
                .forEach((stream: typeof DataStream) => plan!.datastreamIds.push(stream.properties.id));
        }
        return Array.from(grouped.values())
            .map(plan => ({...plan, datastreamIds: Array.from(new Set(plan.datastreamIds))}))
            .filter(plan => plan.datastreamIds.length > 0);
    }, [stableLaneMap, tableMode, currentLane, filter, baseServerFilter]);

    const bulkQueryPlans = useMemo<QueryPlan[]>(() => queryPlans.map(plan => ({
        ...plan,
        key: `${plan.key}\u001fbulk-eligible`,
        filter: combineServerFilters(plan.filter, "gammaAlarm=true OR neutronAlarm=true", "adjudicatedIdsCount=0"),
    })), [queryPlans]);

    const findLaneByDataStreamId = useCallback((datastreamId: string): LaneMapEntry | undefined =>
        Array.from(stableLaneMap.values()).find(lane => lane.datastreams.some((stream: any) => stream.properties.id === datastreamId)), [stableLaneMap]);

    const notificationServiceRef = useRef<NotificationService | null>(null);
    useEffect(() => {
        if (!notificationServiceRef.current) notificationServiceRef.current = new NotificationService();
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then(registration => notificationServiceRef.current?.init(registration));
        }
    }, []);

    useEffect(() => {
        selectedRowIdRef.current = selectedRowId;
    }, [selectedRowId]);

    const cancelRealtimeResolutionJobs = useCallback(() => {
        realtimeResolutionJobsRef.current.forEach(job => {
            job.cancelledByCleanup = true;
            window.clearTimeout(job.timeout);
            job.controller.abort();
        });
        realtimeResolutionJobsRef.current.clear();
    }, []);

    useEffect(() => () => cancelRealtimeResolutionJobs(), [cancelRealtimeResolutionJobs]);

    const sendNotification = useCallback(async (event: EventTableData, nodeId: string): Promise<void> => {
        if (event.status === "None" || !notificationServiceRef.current?.isReady()) return;
        try {
            await notificationServiceRef.current.showNotification(NotificationTemplates.newAlarm(event, {
                title: t("newAlarmTitle", {status: t(event.status === "Gamma & Neutron" ? "gammaAndNeutron" : event.status.toLowerCase())}),
                body: t("newAlarmBody", {lane: event.laneId, occupancyId: event.occupancyCount ?? ""}),
                viewAlarm: t("viewAlarm"),
                events: t("events"),
                dismiss: t("dismiss"),
            }, activeViewKey, nodeId));
        } catch (error) {
            console.error("Unable to show alarm notification", error);
        }
    }, [t, activeViewKey]);

    const eventFromObservation = useCallback((observation: any, lane: LaneMapEntry, live: boolean): EventTableData => {
        const event = createEventFromOccupancyObservation(observation, lane, !live);
        eventCacheRef.current.set(eventSelectionKey(event), event);
        return event;
    }, []);

    const replaceRealtimeEventIdentity = useCallback((original: EventTableData, resolved: EventTableData) => {
        if (!resolved.occupancyObsId || resolved === original) return;

        const originalKey = eventSelectionKey(original);
        const resolvedKey = eventSelectionKey(resolved);
        if (eventCacheRef.current.get(originalKey) === original)
            eventCacheRef.current.delete(originalKey);
        eventCacheRef.current.set(resolvedKey, resolved);
        setRows(previous => deduplicateEvents(previous.map(row => row === original ? resolved : row)));

        const replaceKey = (previous: Set<string>) => {
            if (!previous.has(originalKey)) return previous;
            const next = new Set(previous);
            next.delete(originalKey);
            next.add(resolvedKey);
            return next;
        };
        setSelectedKeys(replaceKey);
        setExcludedKeys(replaceKey);
        setPostSelectionKeys(replaceKey);

        if (selectedRowIdRef.current === original.id) {
            dispatch(setEventPreview({isOpen: true, eventData: resolved}));
            dispatch(setSelectedEvent(resolved));
        }
    }, [dispatch]);

    const resolveIdentityAndNotify = useCallback((event: EventTableData, lane: LaneMapEntry) => {
        if (event.status === "None") return;

        // Alarm delivery is immediate. Until the durable observation exists,
        // the honest action opens Events; a successful resolution replaces
        // this notification with the direct Event Details action.
        const fallbackDelivery = sendNotification(event, lane.parentNode.id);

        const controller = new AbortController();
        const job = {
            controller,
            cancelledByCleanup: false,
            timeout: window.setTimeout(() => controller.abort(), REALTIME_ID_RESOLUTION_TIMEOUT_MS),
        };
        realtimeResolutionJobsRef.current.add(job);

        void resolveRealtimeEventForNotification(event, lane, controller.signal)
            .then(async resolved => {
                if (job.cancelledByCleanup) return;
                if (!resolved.occupancyObsId || resolved === event) return;
                replaceRealtimeEventIdentity(event, resolved);
                await fallbackDelivery;
                if (job.cancelledByCleanup) return;
                await sendNotification(resolved, lane.parentNode.id);
            })
            .catch(error => {
                if (job.cancelledByCleanup) return;
                console.error("Unable to resolve realtime event identity before notification", error);
            })
            .finally(() => {
                window.clearTimeout(job.timeout);
                realtimeResolutionJobsRef.current.delete(job);
            });
    }, [replaceRealtimeEventIdentity, sendNotification]);

    const fetchPlanRows = useCallback(async (plan: QueryPlan, limit: number, offset: number, cutoff = pageLoadedTime) => {
        const params = buildObservationPageParams(plan, cutoff, limit, offset);
        const response = await fetch(`${plan.node.getConnectedSystemsEndpoint(false)}/observations?${params}`, {
            headers: {...plan.node.getBasicAuthHeader(), Accept: "application/om+json"},
            credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const observations = Array.isArray(payload?.items) ? payload.items : [];
        return observations.flatMap((properties: any) => {
            const lane = findLaneByDataStreamId(properties["datastream@id"]);
            const observation = {id: properties.id, properties};
            return lane ? [eventFromObservation(observation, lane, false)] : [];
        });
    }, [eventFromObservation, findLaneByDataStreamId, pageLoadedTime]);

    const fetchPlanCount = useCallback(async (plan: QueryPlan, cutoff = pageLoadedTime, strict = false): Promise<number> => {
        const params = buildObservationCountParams(plan, cutoff);
        try {
            const response = await fetch(`${plan.node.getConnectedSystemsEndpoint(false)}/observations/count?${params}`, {
                headers: {...plan.node.getBasicAuthHeader(), "Content-Type": "sml+json"},
                credentials: "include",
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return Number((await response.json()).count) || 0;
        } catch (error) {
            console.error("Error fetching filtered event count", error);
            if (strict) throw error;
            return 0;
        }
    }, [pageLoadedTime]);

    const refreshCounts = useCallback(async () => {
        const requestId = ++countRequestRef.current;
        if (queryPlans.length === 0) {
            setRowCount(0);
            return;
        }
        const counts = await runWithConcurrency(queryPlans, 6, plan => fetchPlanCount(plan));
        if (requestId !== countRequestRef.current) return;
        setRowCount(counts.reduce((sum, count) => sum + count, 0));
    }, [queryPlans, fetchPlanCount]);

    const fetchPage = useCallback(async (page: number) => {
        const requestId = ++pageRequestRef.current;
        if (queryPlans.length === 0) {
            setRows([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (queryPlans.length === 1) {
                const pageRows = await fetchPlanRows(queryPlans[0], PAGE_SIZE, page * PAGE_SIZE);
                if (requestId !== pageRequestRef.current) return;
                setRows(deduplicateEvents(pageRows));
                currentPageRef.current = page;
                return;
            }
            const required = (page + 1) * PAGE_SIZE;
            const results = await runWithConcurrency(queryPlans, 6, plan => fetchPlanRows(plan, required, 0));
            if (requestId !== pageRequestRef.current) return;
            const merged = deduplicateEvents(results.flat())
                .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime());
            setRows(merged.slice(page * PAGE_SIZE, required));
            currentPageRef.current = page;
        } catch (error) {
            if (requestId !== pageRequestRef.current) return;
            console.error("Error fetching filtered events", error);
            setRows([]);
        } finally {
            if (requestId === pageRequestRef.current) setLoading(false);
        }
    }, [queryPlans, fetchPlanRows]);

    useEffect(() => {
        refreshCounts();
        fetchPage(0);
    }, [refreshCounts, fetchPage]);

    useEffect(() => {
        if (paginationModel.page > 0) fetchPage(paginationModel.page);
        currentPageRef.current = paginationModel.page;
    }, [paginationModel.page, fetchPage]);

    const rowPassesLocalFilters = useCallback((event: EventTableData, lane: LaneMapEntry): boolean => {
        if (tableMode === "alarmtable" && (event.status === "None" || event.adjudicatedIds?.length > 0)) return false;
        if (tableMode === "lanelog" && currentLane && event.laneId !== currentLane) return false;
        return eventMatchesFilter(filter, event, {
            nodeId: lane.parentNode.id,
            nodeName: lane.parentNode.name,
            laneId: lane.laneName,
        });
    }, [tableMode, currentLane, filter]);

    useEffect(() => {
        if (stableLaneMap.size === 0) return;
        let active = true;
        const subscriptions: Array<{source: any; handler: RealtimeEventHandler}> = [];
        for (const lane of stableLaneMap.values()) {
            const occupancyStream: typeof DataStream = lane.findDataStreamByObsProperty(OCCUPANCY_PILLAR_DEF);
            if (!occupancyStream) continue;
            const source = lane.datasourcesRealtime?.find((item: any) => item.properties.resource?.split("/")[2] === occupancyStream.properties.id);
            if (!source) continue;
            const handleMessage = (message: any) => {
                if (!active) return;
                try {
                    const event = eventFromObservation(message.values?.[0]?.data || message, lane, true);
                    event.setDataStreamId(occupancyStream.properties.id);
                    event.setRPMSystemId(occupancyStream.properties["system@id"]);
                    resolveIdentityAndNotify(event, lane);
                    if (currentPageRef.current !== 0) return;
                    if (!rowPassesLocalFilters(event, lane)) return;
                    if (allFilteredCutoffRef.current && event.status !== "None" && !event.adjudicatedIds?.length) {
                        setPostSelectionKeys(previous => new Set(previous).add(eventSelectionKey(event)));
                    }
                    setRowCount(previous => previous + 1);
                    setRows(previous => deduplicateEvents([event, ...previous]).slice(0, PAGE_SIZE));
                } catch (error) {
                    console.error("Error processing live occupancy event", error);
                }
            };
            source.subscribe(handleMessage, [EventType.DATA]);
            try {
                source.connect();
                subscriptions.push({source, handler: handleMessage});
            } catch (error) {
                console.error("Error connecting occupancy source", error);
            }
        }
        return () => {
            active = false;
            cancelRealtimeResolutionJobs();
            subscriptions.forEach(({source, handler}) =>
                removeRealtimeEventSubscription(source, handler));
        };
    }, [stableLaneMap, eventFromObservation, rowPassesLocalFilters, resolveIdentityAndNotify, cancelRealtimeResolutionJobs]);

    useEffect(() => {
        if (!adjudicatedEventId || tableMode !== "alarmtable") return;
        setRows(previous => previous.filter(row => row.id !== adjudicatedEventId));
        setRowCount(previous => Math.max(0, previous - 1));
        dispatch(setAdjudicatedEventId(null));
    }, [adjudicatedEventId, tableMode, dispatch]);

    const clearSelection = useCallback(() => {
        setSelectedKeys(new Set());
        setExcludedKeys(new Set());
        setPostSelectionKeys(new Set());
        setAllFilteredSelected(false);
        setAllFilteredTotal(0);
        allFilteredCutoffRef.current = null;
        failedBulkRef.current = [];
    }, []);

    const applyFilter = (next: EventFilterGroup) => {
        setFilter(next);
        setFilterDialogOpen(false);
        setPaginationModel(previous => ({...previous, page: 0}));
        setPageLoadedTime(new Date().toISOString());
        clearSelection();
    };

    const visibleSelectionModel = useMemo<GridRowSelectionModel>(() => rows
        .filter(row => row.status !== "None" && !row.adjudicatedIds?.length)
        .filter(row => allFilteredSelected
            ? !excludedKeys.has(eventSelectionKey(row)) && !postSelectionKeys.has(eventSelectionKey(row))
            : selectedKeys.has(eventSelectionKey(row)))
        .map(eventSelectionKey), [rows, allFilteredSelected, excludedKeys, postSelectionKeys, selectedKeys]);

    const handleSelectionChange = (model: GridRowSelectionModel) => {
        const visible = new Set(model.map(String));
        if (allFilteredSelected) {
            setExcludedKeys(previous => {
                const next = new Set(previous);
                rows.filter(row => row.status !== "None" && !row.adjudicatedIds?.length).forEach(row => {
                    const key = eventSelectionKey(row);
                    if (visible.has(key)) next.delete(key); else next.add(key);
                });
                return next;
            });
        } else {
            setSelectedKeys(previous => {
                const next = new Set(previous);
                rows.filter(row => row.status !== "None" && !row.adjudicatedIds?.length).forEach(row => {
                    const key = eventSelectionKey(row);
                    if (visible.has(key)) next.add(key); else next.delete(key);
                });
                return next;
            });
        }
    };

    const selectedCount = allFilteredSelected ? Math.max(0, allFilteredTotal - excludedKeys.size) : selectedKeys.size;

    const getLatestGB = async (event: EventTableData) => {
        for (const lane of stableLaneMap.values()) {
            const threshold = lane.datastreams
                .filter((stream: any) => isThresholdDataStream(stream))
                .find((stream: typeof DataStream) => stream.properties["system@id"] === event.rpmSystemId);
            if (threshold) dispatch(setLatestGB(await getObservations(event.startTime, event.endTime, threshold)));
        }
    };

    const previewEvent = (event: EventTableData, navigate = false) => {
        dispatch(setEventPreview({isOpen: true, eventData: event}));
        dispatch(setSelectedRowId(event.id));
        dispatch(setSelectedEvent(event));
        getLatestGB(event);
        if (navigate) {
            const lane = stableLaneMap.get(event.laneId);
            const href = event.occupancyObsId
                ? buildEventDetailsHref(event.occupancyObsId, lane?.parentNode.id)
                : "/event-details";
            router.push(scopedHref(href));
        }
    };

    const enumerateAllFiltered = useCallback(async (): Promise<EventTableData[]> => {
        const cutoff = allFilteredCutoffRef.current ?? pageLoadedTime;
        const planRows = await runWithConcurrency(bulkQueryPlans, 4, async plan => {
            const count = await fetchPlanCount(plan, cutoff, true);
            const collected: EventTableData[] = [];
            for (let offset = 0; offset < count; offset += BULK_FETCH_SIZE)
                collected.push(...await fetchPlanRows(plan, BULK_FETCH_SIZE, offset, cutoff));
            return collected;
        });
        return deduplicateEvents(planRows.flat())
            .filter(event => !excludedKeys.has(eventSelectionKey(event)));
    }, [bulkQueryPlans, fetchPlanCount, fetchPlanRows, excludedKeys, pageLoadedTime]);

    const selectAllFilteredAlarms = async () => {
        const cutoff = pageLoadedTime;
        setLoading(true);
        try {
            const counts = await runWithConcurrency(bulkQueryPlans, 6, plan => fetchPlanCount(plan, cutoff, true));
            allFilteredCutoffRef.current = cutoff;
            setAllFilteredTotal(counts.reduce((sum, count) => sum + count, 0));
            setAllFilteredSelected(true);
            setSelectedKeys(new Set());
            setExcludedKeys(new Set());
            setPostSelectionKeys(new Set());
        } catch (error) {
            console.error("Unable to select all filtered alarms", error);
            clearSelection();
            setBulkSelectionError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async (
        values: BulkAdjudicationValues,
        retryFailures: boolean,
        onProgress: (complete: number, total: number) => void,
    ): Promise<BulkAdjudicationSummary> => {
        let events: EventTableData[];
        if (retryFailures) {
            events = failedBulkRef.current;
        } else if (allFilteredSelected) {
            events = await enumerateAllFiltered();
        } else {
            events = Array.from(selectedKeys).flatMap(key => {
                const event = eventCacheRef.current.get(key);
                return event ? [event] : [];
            });
            if (events.length !== selectedKeys.size)
                throw new Error("One or more selected events are no longer available");
        }
        const outcomes: BulkAdjudicationOutcome[] = await adjudicateEvents(events, stableLaneMap, values, onProgress);
        const successful = outcomes.filter(outcome => outcome.ok);
        const failed = outcomes.filter(outcome => !outcome.ok);
        failedBulkRef.current = failed.map(outcome => outcome.event);
        const successfulKeys = new Set(successful.map(outcome => eventSelectionKey(outcome.event)));
        if (tableMode === "alarmtable") {
            setRows(previous => previous.filter(event => !successfulKeys.has(eventSelectionKey(event))));
            setRowCount(previous => Math.max(0, previous - successful.length));
        } else {
            setRows(previous => previous.map(event => {
                if (successfulKeys.has(eventSelectionKey(event))) event.adjudicatedIds = ["bulk-adjudicated"];
                return event;
            }));
        }
        setAllFilteredSelected(false);
        setAllFilteredTotal(0);
        allFilteredCutoffRef.current = null;
        setExcludedKeys(new Set());
        setPostSelectionKeys(new Set());
        setSelectedKeys(new Set(failed.map(outcome => eventSelectionKey(outcome.event))));
        return {success: successful.length, failed: failed.length};
    };

    const columns = useMemo<GridColDef<EventTableData>[]>(() => [
        {
            field: "laneId", headerName: t("laneId"), minWidth: 110, flex: 1,
            renderCell: params => <Box sx={{display: "flex", flexDirection: "column", justifyContent: "center", py: 0.5}}>
                <span>{params.row.laneId}</span>
                <span style={{fontSize: "0.8rem", color: "gray"}}>{params.row.parentNode}</span>
            </Box>,
        },
        {field: "occupancyCount", headerName: t("occupancyId"), minWidth: 125, flex: 1.2},
        {
            field: "startTime", headerName: t("startTime"), minWidth: 200, flex: 1.8, type: "dateTime",
            valueGetter: value => new Date(value),
            valueFormatter: value => new Date(value).toLocaleString(locale),
        },
        {
            field: "endTime", headerName: t("endTime"), minWidth: 200, flex: 1.8, type: "dateTime",
            valueGetter: value => new Date(value),
            valueFormatter: value => new Date(value).toLocaleString(locale),
        },
        {field: "maxGamma", headerName: t("maxGamma"), minWidth: 150, flex: 1.2},
        {field: "maxNeutron", headerName: t("maxNeutron"), minWidth: 150, flex: 1.2},
        {field: "status", headerName: t("status"), minWidth: 135, flex: 1.2},
        {
            field: "adjudicatedIds", headerName: t("adjudicated"), minWidth: 110, flex: 1,
            valueFormatter: (value: any) => value?.length > 0 ? t("yes") : t("no"),
        },
        {
            field: "Menu", headerName: "", type: "actions", minWidth: 50,
            getActions: params => [<GridActionsCellItem key="details" icon={<VisibilityRoundedIcon />} label={t("details")} onClick={() => previewEvent(params.row, true)} showInMenu />],
        },
    ], [locale, t]);

    const getColumnList = () => columns
        .filter(column => viewAdjudicated || column.field !== "adjudicatedIds")
        .map(column => column.field);

    return (
        <Box sx={{height: 800, width: "100%"}}>
            <DataGrid
                localeText={getDataGridLocaleText(language)}
                rows={rows}
                getRowId={eventSelectionKey}
                columns={columns}
                loading={loading}
                paginationMode="server"
                filterMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={model => setPaginationModel(model)}
                rowCount={rowCount}
                pageSizeOptions={[PAGE_SIZE]}
                checkboxSelection
                isRowSelectable={params => params.row.status !== "None" && !params.row.adjudicatedIds?.length}
                disableRowSelectionOnClick
                keepNonExistentRowsSelected
                rowSelectionModel={visibleSelectionModel}
                onRowSelectionModelChange={handleSelectionChange}
                onRowClick={(params, event) => {
                    const cell = (event.target as HTMLElement).closest("[data-field]");
                    const field = cell?.getAttribute("data-field");
                    if (field !== GRID_CHECKBOX_SELECTION_FIELD && field !== "Menu") previewEvent(params.row);
                }}
                onRowDoubleClick={(params: GridRowParams<EventTableData>) => previewEvent(params.row, true)}
                slots={{toolbar: CustomToolbar}}
                slotProps={{
                    toolbar: {
                        activeFilterCount: countEventFilterRules(filter),
                        selectedCount,
                        rowCount,
                        allFilteredSelected,
                        filterLabel: t("advancedFilters"),
                        selectAllFilteredLabel: t("selectAllFiltered"),
                        clearSelectionLabel: t("clearSelection"),
                        bulkAdjudicateLabel: t("bulkAdjudicateSelected", {count: selectedCount}),
                        onOpenFilters: () => setFilterDialogOpen(true),
                        onSelectAllFiltered: selectAllFilteredAlarms,
                        onClearSelection: clearSelection,
                        onBulkAdjudicate: () => setBulkDialogOpen(true),
                    },
                    columnsManagement: {getTogglableColumns: getColumnList},
                }}
                initialState={{
                    sorting: {sortModel: [{field: "startTime", sort: "desc"}]},
                    columns: {columnVisibilityModel: {adjudicatedIds: viewAdjudicated}},
                }}
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    if (params.value === "Gamma") return "highlightGamma";
                    if (params.value === "Neutron") return "highlightNeutron";
                    if (params.value === "Gamma & Neutron" || (params.value !== "None" && params.field === "status")) return "highlightGammaNeutron";
                    return "";
                }}
                getRowClassName={params => params.row.id === selectedRowId ? "preview-row" : ""}
                sx={{
                    [`.${gridClasses.row}.preview-row`]: {boxShadow: "inset 3px 0 0 #1976d2"},
                    [`.${gridClasses.cell}.highlightGamma`]: {backgroundColor: "error.main", color: "error.contrastText"},
                    [`.${gridClasses.cell}.highlightNeutron`]: {backgroundColor: "info.main", color: "info.contrastText"},
                    [`.${gridClasses.cell}.highlightGammaNeutron`]: {backgroundColor: "secondary.main", color: "secondary.contrastText"},
                    border: "none",
                }}
            />
            <NestedEventFilterDialog
                open={filterDialogOpen}
                filter={filter}
                nodeOptions={nodeOptions}
                laneOptions={laneOptions}
                t={t}
                onClose={() => setFilterDialogOpen(false)}
                onApply={applyFilter}
            />
            <BulkAdjudicationDialog
                open={bulkDialogOpen}
                count={selectedCount}
                allFiltered={allFilteredSelected}
                t={t}
                onClose={() => setBulkDialogOpen(false)}
                onSubmit={handleBulkSubmit}
            />
            <Snackbar open={bulkSelectionError} autoHideDuration={6000} onClose={() => setBulkSelectionError(false)}>
                <Alert severity="error" onClose={() => setBulkSelectionError(false)}>{t("bulkSelectionLoadFailed")}</Alert>
            </Snackbar>
        </Box>
    );
}
