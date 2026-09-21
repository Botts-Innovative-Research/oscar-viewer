"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import Observations from "osh-js/source/core/consysapi/observation/Observations";
import {EventType} from "osh-js/source/core/event/EventType";
import {useRouter} from "next/dist/client/components/navigation";

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {isOccupancyDataStream, isThresholdDataStream} from "@/lib/data/oscar/Utilities";
import {convertToMap, hashString} from "@/app/utils/Utils";
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

    const sendNotification = useCallback((event: EventTableData) => {
        if (event.status === "None" || !notificationServiceRef.current?.isReady()) return;
        notificationServiceRef.current.showNotification(NotificationTemplates.newAlarm(event, {
            title: t("newAlarmTitle", {status: t(event.status === "Gamma & Neutron" ? "gammaAndNeutron" : event.status.toLowerCase())}),
            body: t("newAlarmBody", {lane: event.laneId, occupancyId: event.occupancyCount ?? ""}),
            viewAlarm: t("viewAlarm"),
            dismiss: t("dismiss"),
        }));
    }, [t]);

    const eventFromObservation = useCallback((observation: any, lane: LaneMapEntry, live: boolean): EventTableData => {
        const result = observation.properties?.result || observation.result || observation;
        const id = hashString(`${result.occupancyCount}${lane.laneName}${result.startTime}${result.endTime}`);
        const event = new EventTableData(
            id,
            lane.laneName,
            result,
            live ? null : observation.properties.id,
            observation.properties?.foiId || observation["foi@id"] || observation.foiId,
            lane.parentNode.name,
            lane.isRS350Backpack,
        );
        const datastreamId = live ? undefined : observation.properties["datastream@id"];
        if (datastreamId) {
            event.setDataStreamId(datastreamId);
            event.setRPMSystemId(lane.lookupSystemIdFromDataStreamId(datastreamId));
        }
        event.setFoiId(observation.properties?.["foi@id"] || observation["foi@id"] || observation.foiId);
        if (!live) event.setOccupancyObsId(observation.id);
        if (live) sendNotification(event);
        eventCacheRef.current.set(eventSelectionKey(event), event);
        return event;
    }, [sendNotification]);

    const fetchPlanRows = useCallback(async (plan: QueryPlan, limit: number, offset: number, cutoff = pageLoadedTime) => {
        const observationFilter = new ObservationFilter({
            dataStream: plan.datastreamIds,
            resultTime: `../${cutoff}`,
            filter: plan.filter,
            order: "desc",
        });
        const api: typeof Observations = await plan.node.getObservationsApi();
        const collection = await api.searchObservations(observationFilter, limit, offset);
        const observations = await collection.fetchData();
        return observations.flatMap((observation: any) => {
            const lane = findLaneByDataStreamId(observation.properties["datastream@id"]);
            return lane ? [eventFromObservation(observation, lane, false)] : [];
        });
    }, [eventFromObservation, findLaneByDataStreamId, pageLoadedTime]);

    const fetchPlanCount = useCallback(async (plan: QueryPlan, cutoff = pageLoadedTime, strict = false): Promise<number> => {
        const params = new URLSearchParams({
            resultTime: `../${cutoff}`,
            format: "application/om+json",
            dataStream: plan.datastreamIds.join(","),
        });
        if (plan.filter) params.set("filter", plan.filter);
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
        const subscriptions: Array<{source: any; handler: (message: any) => void}> = [];
        for (const lane of stableLaneMap.values()) {
            const occupancyStream: typeof DataStream = lane.findDataStreamByObsProperty(OCCUPANCY_PILLAR_DEF);
            if (!occupancyStream) continue;
            const source = lane.datasourcesRealtime?.find((item: any) => item.properties.resource?.split("/")[2] === occupancyStream.properties.id);
            if (!source) continue;
            const handleMessage = (message: any) => {
                if (currentPageRef.current !== 0) return;
                try {
                    const event = eventFromObservation(message.values?.[0]?.data || message, lane, true);
                    event.setDataStreamId(occupancyStream.properties.id);
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
        return () => subscriptions.forEach(({source, handler}) => {
            const listeners = source.eventSubscriptionMap?.[EventType.DATA];
            if (!Array.isArray(listeners)) return;
            const index = listeners.indexOf(handler);
            if (index >= 0) listeners.splice(index, 1);
        });
    }, [stableLaneMap, eventFromObservation, rowPassesLocalFilters]);

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
        if (navigate) router.push("/event-details");
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
