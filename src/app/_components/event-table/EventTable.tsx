"use client"

import { LaneMapEntry } from "@/lib/data/oscar/LaneCollection";
import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import { useSelector } from "react-redux";
import {
    setEventPreview,
    setSelectedRowId,
    selectSelectedRowId,
    setLatestGB
} from "@/lib/state/EventPreviewSlice";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import { EventTableData } from "@/lib/data/oscar/TableHelpers";
import {
    DataGrid, getGridDateOperators, getGridSingleSelectOperators,
    GridActionsCellItem,
    GridCellParams,
    gridClasses,
    GridColDef,
    GridRowParams,
    GridRowSelectionModel
} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { useAppDispatch } from "@/lib/state/Hooks";
import {selectAdjudicatedEventId, selectSelectedEvent, setAdjudicatedEventId, setSelectedEvent} from "@/lib/state/EventDataSlice";
import { useRouter } from "next/dist/client/components/navigation";
import { getObservations } from "@/app/utils/ChartUtils";
import { isOccupancyDataStream, isThresholdDataStream } from "@/lib/data/oscar/Utilities";
import { convertToMap, hashString } from "@/app/utils/Utils";
import { OCCUPANCY_PILLAR_DEF } from "@/lib/data/Constants";
import { selectNodes } from "@/lib/state/OSHSlice";
import {INode} from "@/lib/data/osh/Node";
import Observations from "osh-js/source/core/consysapi/observation/Observations";
import { GridFilterModel } from "@mui/x-data-grid"

import { useLanguage } from '@/app/contexts/LanguageContext';
import {NotificationService, NotificationTemplates} from "../notifications/NotificationService";
import {
    AdjudicationGroup,
    AlarmFilterState,
    AlarmType,
    DEFAULT_ALARM_FILTER,
    cloneAlarmFilter
} from "@/app/_components/event-table/AlarmFilterPopover";
import { useAdjudicationMap, AdjudicationByOccupancy } from "@/app/_components/event-table/useAdjudicationMap";
import { AdjudicationCodes } from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import { EventTableColumnSetting, LaneSelection } from "@/lib/layout/PageConfigTypes";
import { resolveLaneSelection } from "@/lib/data/oscar/streams/LaneStreamRegistry";
import { useLaneStreams } from "@/lib/data/oscar/streams/useLaneStreams";
import { GridColumnVisibilityModel } from "@mui/x-data-grid";
import * as React from "react";


interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "lanelog";
    viewSecondary?: boolean;
    currentLane?: string;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
    laneMap: Map<string, LaneMapEntry>;
    setEvents?: unknown;
    /** Widget config: restrict to a lane subset (applies to fetch + live rows). */
    laneFilter?: LaneSelection;
    /** Widget config: column order (array order) and visibility. */
    columnSettings?: EventTableColumnSetting[];
    /** Widget config: adjudication state filter. */
    adjudicatedFilter?: 'any' | 'yes' | 'no';
    /** Widget config: alarm status filter (e.g. ['Gamma','Neutron']). */
    statusFilter?: string[];
    /** Widget config: ISO date range for the fetch window. */
    dateRange?: { start?: string; end?: string };
    /** Extra per-row actions (e.g. widget adjudicate button). */
    extraRowActions?: (row: EventTableData) => React.ReactNode[];
    /** Container height; the original pages use the default 800. */
    tableHeight?: number | string;
    /**
     * Fires when the user toggles columns via the grid's own column panel so
     * the owner can persist the change (only used with columnSettings).
     */
    onColumnVisibilityChange?: (model: GridColumnVisibilityModel) => void;
}


export default function EventTable({
                                       tableMode,
                                       viewLane = false,
                                       viewAdjudicated = false,
                                       laneMap,
                                       currentLane,
                                       laneFilter,
                                       columnSettings,
                                       adjudicatedFilter,
                                       statusFilter,
                                       dateRange,
                                       extraRowActions,
                                       tableHeight = 800,
                                       onColumnVisibilityChange,
                                   }: TableProps) {

    const nodes = useSelector(selectNodes);
    const selectedRowId = useSelector(selectSelectedRowId);
    const [loading, setLoading] = useState(false);
    const pageSize = 15;
    const [rowCount, setRowCount] = useState(0);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([selectedRowId]);
    const [filteredTableData, setFilteredTableData] = useState<EventTableData[]>([]);
    const [totalCount, setTotalCount] = useState<Map<string, number>>(new Map());
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize });
    const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] })
    const [alarmFilter, setAlarmFilter] = useState<AlarmFilterState>(() => cloneAlarmFilter(DEFAULT_ALARM_FILTER));
    const adjudicatedEventId = useSelector(selectAdjudicatedEventId);
    const selectedEvent = useSelector(selectSelectedEvent);
    const dispatch = useAppDispatch();
    const router = useRouter();

    const { t } = useLanguage();
    const stableLaneMap = useMemo(() => convertToMap(laneMap), [laneMap]);

    // Lane subset from widget config; null = no restriction.
    const laneFilterSet = useMemo<Set<string> | null>(() => {
        if (!laneFilter || laneFilter.mode === 'all') return null;
        return new Set(resolveLaneSelection(laneFilter, stableLaneMap));
    }, [laneFilter, stableLaneMap]);

    const wantsAdjudicationColumns = useMemo(() =>
        (columnSettings ?? []).some((c) => c.visible && (c.key === 'adjudicationGroup' || c.key === 'secondaryInspection')),
        [columnSettings]);
    const adjudicationMap: AdjudicationByOccupancy = useAdjudicationMap(
        stableLaneMap, tableMode === "alarmtable" || wantsAdjudicationColumns);
    const currentPageRef = useRef(0);
    const locale = navigator.language || 'en-US';

    const columns: GridColDef<EventTableData>[] = [
        {
            field: 'laneId',
            headerName: t('laneId'),
            type: 'string',
            minWidth: 100,
            flex: 1,
            filterable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5 }}>
                    <span style={{ lineHeight: 1.25 }}>{params.row.laneId}</span>
                    <span style={{ fontSize: '0.8rem', color: 'gray', lineHeight: 1.25 }}>{params.row.parentNode}</span>
                </Box>
            )
        },
        {
            field: 'occupancyCount',
            headerName: t('occupancyId'),
            type: 'string',
            minWidth: 125,
            flex: 1.5,
            filterable: false
        },
        {
            field: 'startTime',
            headerName: t('startTime'),
            valueFormatter: (params) => (new Date(params)).toLocaleString(locale, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            }),
            minWidth: 200,
            flex: 2,
            type: "dateTime",
            filterOperators: getGridDateOperators(true).filter(
                (op) => ['after', 'before'].includes(op.value)
            )
        },
        {
            field: 'endTime',
            headerName: t('endTime'),
            valueFormatter: (params) => (new Date(params)).toLocaleString(locale, {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric'
            }),
            minWidth: 200,
            flex: 2,
            type: "dateTime",
            filterOperators: getGridDateOperators(true).filter(
                (op) => ['after', 'before'].includes(op.value)
            )
        },
        {
            field: 'maxGamma',
            headerName: t('maxGamma'),
            valueFormatter: (params) => (typeof params === 'number' ? params : 0),
            minWidth: 150,
            flex: 1.2,
            filterable: false
        },
        {
            field: 'maxNeutron',
            headerName: t('maxNeutron'),
            valueFormatter: (params) => (typeof params === 'number' ? params : 0),
            minWidth: 150,
            flex: 1.2,
            filterable: false
        },
        {
            field: 'status',
            headerName: t('status'),
            minWidth: 125,
            flex: 1.2,
            type: 'singleSelect',
            valueOptions: ['None', 'Gamma', 'Neutron', 'Gamma & Neutron'],
            filterOperators: getGridSingleSelectOperators().filter(
                (op) => ['is'].includes(op.value)
                // (op) => ['is', 'not'].includes(op.value)
            )
        },
        {
            field: 'adjudicatedIds',
            headerName: t('adjudicated'),
            valueFormatter: (params: any) => params.length > 0 ? "Yes" : "No",
            minWidth: 100,
            flex: 1,
            filterable: viewAdjudicated,
            type: 'singleSelect',
            valueOptions: ['Yes', 'No'],
            filterOperators: getGridSingleSelectOperators().filter(
                (op) => ['is', 'equal'].includes(op.value)
            )
        },
        {
            field: 'adjudicationGroup',
            headerName: t('adjudicationStatus'),
            minWidth: 150,
            flex: 1.3,
            filterable: false,
            valueGetter: (_: any, row: EventTableData) => row.adjudicationGroup || 'Not Adjudicated'
        },
        {
            field: 'secondaryInspection',
            headerName: t('secondaryInspection'),
            minWidth: 140,
            flex: 1.1,
            filterable: false,
            valueGetter: (_: any, row: EventTableData) => row.secondaryInspection || 'NONE'
        },
        {
            field: 'Menu',
            headerName: '',
            type: 'actions',
            minWidth: extraRowActions ? 90 : 50,
            flex: 0.5,
            getActions: (params) => [
                ...(extraRowActions ? (extraRowActions(params.row) as any[]) : []),
                selectionModel.includes(params.row.id) ? (
                    <GridActionsCellItem
                        key="details"
                        icon={<VisibilityRoundedIcon />}
                        label={t('details')}
                        onClick={() => handleEventPreview()}
                        showInMenu
                    />
                ) : <></>,
            ],
        },
    ];

    // Widget-configured column order: settings order first, remaining base
    // columns (e.g. the actions column) keep their relative order at the end.
    const orderedColumns: GridColDef<EventTableData>[] = (() => {
        if (!columnSettings || columnSettings.length === 0) return columns;
        const byField = new Map(columns.map((c) => [c.field, c]));
        const ordered: GridColDef<EventTableData>[] = [];
        for (const setting of columnSettings) {
            const col = byField.get(setting.key);
            if (col) {
                ordered.push(col);
                byField.delete(setting.key);
            }
        }
        for (const col of columns) {
            if (byField.has(col.field)) ordered.push(col);
        }
        return ordered;
    })();

    const columnSettingsKey = columnSettings ? JSON.stringify(columnSettings) : null;
    const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({});
    useEffect(() => {
        if (!columnSettings) return;
        const model: GridColumnVisibilityModel = {};
        for (const s of columnSettings) model[s.key] = s.visible;
        setColumnVisibilityModel(model);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnSettingsKey]);

    const handlePaginationChange = useCallback((model: { page: number; pageSize: number }) => {
        if (model.page === 0 && paginationModel.page !== 0) {
            setPageLoadedTime(new Date().toISOString());
            fetchAllCounts();
        }
        setPaginationModel(model);
    }, [paginationModel.page]);

    const getDatastreamIds = useCallback((node: any): string[] => {
        const datastreamIds: string[] = [];

        if (tableMode === "lanelog" && currentLane != null) {

            const entry = stableLaneMap.get(currentLane);
            if (!entry) return datastreamIds;

            if (entry.parentNode.id !== node.id)
                return;


            const occStreams = entry.datastreams.filter((ds: typeof DataStream) => isOccupancyDataStream(ds));
            for (const ds of occStreams) {
                datastreamIds.push(ds.properties.id);
            }

        } else {
            stableLaneMap.forEach((entry: LaneMapEntry, laneId: string) => {
                if (entry.parentNode.id !== node.id)
                    return;
                if (laneFilterSet && !laneFilterSet.has(laneId))
                    return;

                const occStreams = entry.datastreams.filter((ds: typeof DataStream) => isOccupancyDataStream(ds));
                for (const ds of occStreams) {
                    datastreamIds.push(ds.properties.id);
                }

            });
        }
        return datastreamIds;
    }, [stableLaneMap, currentLane, tableMode, laneFilterSet]);

    const enrichRowWithAdjudication = useCallback((row: EventTableData): EventTableData => {
        const occId = row.occupancyObsId;
        const adj = occId ? adjudicationMap.get(occId) : undefined;
        if (adj) {
            row.setSecondaryInspection(adj.secondaryInspectionStatus || "NONE");
            row.setAdjudicationGroup(adj.adjudicationCode?.group || "Not Adjudicated");
        } else {
            row.setSecondaryInspection("NONE");
            row.setAdjudicationGroup("Not Adjudicated");
        }
        return row;
    }, [adjudicationMap]);

    const passesAlarmFilter = useCallback((row: EventTableData): boolean => {
        if (!alarmFilter.alarmTypes.has(row.status as AlarmType)) {
            // status may be a raw alarmCategoryCode (Code N: ...) rather than one of the AlarmType strings.
            // If so, treat as alarming and require one of Gamma/Neutron/Gamma & Neutron to be selected.
            const knownStatuses = ['None', 'Gamma', 'Neutron', 'Gamma & Neutron'];
            if (knownStatuses.includes(row.status)) return false;
            const anyAlarmSelected =
                alarmFilter.alarmTypes.has('Gamma') ||
                alarmFilter.alarmTypes.has('Neutron') ||
                alarmFilter.alarmTypes.has('Gamma & Neutron');
            if (!anyAlarmSelected) return false;
        }
        if (!alarmFilter.adjudicationGroups.has(row.adjudicationGroup as AdjudicationGroup)) return false;
        if (!alarmFilter.secondaryStatuses.has((row.secondaryInspection || "NONE") as any)) return false;
        return true;
    }, [alarmFilter]);

    const filterRows = useCallback((rows: EventTableData[]): EventTableData[] => {
        const laneScoped = laneFilterSet
            ? rows.filter((row) => laneFilterSet.has(row.laneId))
            : rows;
        switch (tableMode) {
            case 'alarmtable':
                return laneScoped.map(enrichRowWithAdjudication).filter(passesAlarmFilter);
            case 'lanelog':
                // Only show events for the current lane
                return laneScoped.filter(row => row.laneId === currentLane);
            case 'eventlog':
            // shows all events
            default:
                return wantsAdjudicationColumns ? laneScoped.map(enrichRowWithAdjudication) : laneScoped;
        }
    }, [tableMode, currentLane, enrichRowWithAdjudication, passesAlarmFilter, laneFilterSet, wantsAdjudicationColumns]);

    useEffect(() => {
        if (adjudicatedEventId && tableMode === 'alarmtable') {
            // Remove the adjudicated event from the table immediately
            setFilteredTableData(prev => prev.filter(row => row.id !== adjudicatedEventId));

            dispatch(setAdjudicatedEventId(null));
        }
    }, [adjudicatedEventId, tableMode, selectedEvent, dispatch]);

    const totalObservations = useMemo(() => {
        let sum = 0;
        totalCount.forEach(count => sum += count);
        return sum;
    }, [totalCount]);

    const totalPages = Math.ceil(totalObservations / pageSize);

    const [pageLoadedTime, setPageLoadedTime] = useState(() => new Date().toISOString());

    const fetchAllCounts = async () => {
        if (nodes.size === 0 || stableLaneMap.size === 0)
            return;

        const counts = new Map<string, number>();
        let total: number = 0;

        for (const node of nodes) {
            const datastreamIds = getDatastreamIds(node);

            if (datastreamIds.length === 0) continue;

            const count = await fetchTotalCount(node, datastreamIds);
            counts.set(node.id, count);

            total += count;
        }

        setTotalCount(counts);
        setRowCount(total);
    }

    useEffect(() => {
        fetchAllCounts();
    }, [nodes, stableLaneMap, getDatastreamIds, alarmFilter]);

    const fetchPage = useCallback(async (userRequestedPage: number): Promise<boolean | undefined> => {
        if (stableLaneMap.size === 0 || nodes.size === 0 || totalPages === 0)
            return;

        setLoading(true);

        try {
            const pageOffset = userRequestedPage * pageSize;
            const allRows: EventTableData[] = [];

            for (const node of nodes) {
                const datastreamIds = getDatastreamIds(node);
                if (datastreamIds.length === 0) continue;

                const observationFilter = new ObservationFilter({
                    dataStream: datastreamIds,
                    resultTime: buildResultTimeQuery(filterModel),
                    // resultTime: `../${pageLoadedTime}`,
                    filter: buildFilterQuery(filterModel, tableMode),
                    // filter: tableMode == "alarmtable" ? "gammaAlarm=true OR neutronAlarm=true" : "",
                    order: 'desc'
                });

                const obsApi: typeof Observations = await node.getObservationsApi();
                const obsCollection = await obsApi.searchObservations(observationFilter, pageSize, pageOffset);
                const results = await obsCollection.fetchData(pageOffset);

                for (const obs of results) {
                    const laneEntry = findLaneByDataStreamId(stableLaneMap, obs.properties["datastream@id"]);
                    if (!laneEntry) continue;

                    const evt = eventFromObservation(obs, laneEntry, false);
                    allRows.push(evt);
                }
            }

            const deduped = deduplicateById(allRows);
            const filtered = filterRows(deduped);
            setFilteredTableData(filtered);
            currentPageRef.current = userRequestedPage;
        } catch (error) {
            console.error("Error fetching observations,", error)
            setFilteredTableData([])
        } finally {
            setLoading(false);
        }

    }, [nodes, stableLaneMap, totalPages, pageLoadedTime, tableMode, getDatastreamIds, filterRows, filterModel, alarmFilter]);

    function deduplicateById(arr: EventTableData[]): EventTableData[] {
        const map = new Map();
        for (const row of arr) map.set(row.id, row);
        return [...map.values()];
    }

    function findLaneByDataStreamId(laneMap: Map<string, LaneMapEntry>, datastreamId: string): LaneMapEntry | null {
        for (const entry of laneMap.values()) {
            if (entry.datastreams.some(ds => ds.properties.id === datastreamId)) {
                return entry;
            }
        }
        return null;
    }

    async function fetchTotalCount(node: INode, datastreamIds: string[]) {
        let endpoint = node.getConnectedSystemsEndpoint(false);
        const queryParams = new URLSearchParams({
            // resultTime: `../${pageLoadedTime}`, I think it is safe to fetch count of all here
            format: "application/om+json",
            dataStream: `${datastreamIds.join(",")}`,
        });
        const countClauses: string[] = buildWidgetConfigClauses();
        if (tableMode === "alarmtable") {
            const alarmQuery = buildAlarmFilterQuery(alarmFilter);
            if (alarmQuery) countClauses.unshift(alarmQuery);
        }
        if (countClauses.length > 0) queryParams.set("filter", countClauses.join(" AND "));
//      `/observations/count?resultTime=../${pageLoadedTime}&format=application/om%2Bjson&dataStream=${datastreamIds.join(",")}${tableMode == "alarmtable" ? "&filter=gammaAlarm=true,neutronAlarm=true" : ""}`
        let fullUrl = endpoint + "/observations/count?" + queryParams;

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    ...node.getBasicAuthHeader(),
                    'Content-Type': 'sml+json'
                },
                mode: "cors"
            });

            if (!response.ok) {
                console.error("Cannot fetch total count");
                return 0;
            }
            let responseJson = await response.json();
            return responseJson.count || 0;
        } catch (error) {
            console.error("Error fetching total observation count", error);
            return 0;
        }
    }

    const notificationServiceRef = useRef<NotificationService | null>(null);

    useEffect(() => {
        if (!notificationServiceRef.current) {
            notificationServiceRef.current = new NotificationService();
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                notificationServiceRef.current?.init(registration);
            });
        }
    }, []);

    function sendNotification(alarmData: { laneName: string, status: string, eventData?: any }) {
        const notificationService = notificationServiceRef.current;
        if (notificationService?.isReady()) {
            notificationService.showNotification(
                NotificationTemplates.newAlarm(alarmData.laneName, alarmData.status, alarmData.eventData)
            )
        }
    }

    function eventFromObservation(obs: any, laneEntry: LaneMapEntry, isLive: boolean): EventTableData {
        const id = prngFromStr(obs, laneEntry.laneName);
        let newEvent: EventTableData;

        if (isLive) {
            // Handle live observations
            const result = obs.result || obs;
            newEvent = new EventTableData(id, laneEntry.laneName, result, null, obs["foi@id"] || obs.foiId, laneEntry.parentNode.name, laneEntry.isRS350Backpack);
            newEvent.setFoiId(obs["foi@id"] || obs.foiId);


            if (newEvent.status !== 'None') {
                sendNotification({ laneName: laneEntry.laneName, status: newEvent.status, eventData: newEvent});
            }
        } else {
            // Handle historical observations
            newEvent = new EventTableData(id, laneEntry.laneName, obs.properties.result, obs.properties.id, obs.properties.foiId, laneEntry.parentNode.name, laneEntry.isRS350Backpack);
            newEvent.setRPMSystemId(laneEntry.lookupSystemIdFromDataStreamId(obs.properties["datastream@id"]));
            newEvent.setDataStreamId(obs.properties["datastream@id"]);
            newEvent.setFoiId(obs.properties["foi@id"]);
            newEvent.setOccupancyObsId(obs.id);
        }

        return newEvent;
    }

    function prngFromStr(obs: any, laneName: string): number {
        const result = obs.properties?.result || obs.result || obs;
        const baseId = `${result.occupancyCount}${laneName}${result.startTime}${result.endTime}`;
        return hashString(baseId);
    }

    useEffect(() => {
        if (totalPages > 0)
            fetchPage(paginationModel.page);
    }, [totalPages, paginationModel.page, filterModel, alarmFilter]);

    useEffect(() => {
        if (tableMode !== 'alarmtable') return;
        setFilteredTableData(prev => prev.map(row => enrichRowWithAdjudication(row)).filter(passesAlarmFilter));
    }, [adjudicationMap, tableMode, enrichRowWithAdjudication, passesAlarmFilter]);

    useEffect(() => {
        currentPageRef.current = paginationModel.page;
    }, [paginationModel.page]);

    // Live occupancy rows via the shared LaneStreamRegistry: one dispatcher per
    // lane, released on unmount (the old direct subscribe/connect stacked
    // handlers on every filter change and never disconnected).
    const liveSelection = useMemo<LaneSelection>(() => {
        if (tableMode === 'lanelog' && currentLane) return {mode: 'include', lanes: [currentLane]};
        return laneFilter ?? {mode: 'all'};
    }, [tableMode, currentLane, laneFilter]);

    useLaneStreams(liveSelection, ['occRT'], (laneId, _stream, msg) => {
        try {
            if (currentPageRef.current !== 0)
                return;

            const entry = stableLaneMap.get(laneId);
            if (!entry) return;

            const obsData = msg.values?.[0]?.data || msg;
            const event = eventFromObservation(obsData, entry, true);

            const occStream = entry.findDataStreamByObsProperty(OCCUPANCY_PILLAR_DEF);
            if (occStream) {
                event.setDataStreamId(occStream.properties.id);
            }

            const filtered = filterRows([event]);
            if (filtered.length === 0) return;

            setRowCount(prev => prev + 1);

            setFilteredTableData(prev => {
                const exists = prev.some(row => row.id === event.id);
                if (exists) return prev;
                return [event, ...prev].slice(0, pageSize);
            });
        } catch (err) {
            console.error("Error creating event from observation:", err);
        }
    }, stableLaneMap.size > 0);

    useEffect(() => {
        if (!selectedRowId)
            setSelectionModel([]);
    }, [selectedRowId]);

    useEffect(() => {
        setRowCount(totalObservations);
    }, [totalObservations]);

    const handleEventPreview = () => {
        router.push("/event-details");
    };

    const handleRowDoubleClick = (params: GridRowParams) => {
        const selectedRow = params.row as EventTableData;
        if (!selectedRow) return;

        setSelectionModel([selectedRow.id]);
        dispatch(setSelectedRowId(selectedRow.id));
        getLatestGB(selectedRow);
        dispatch(setEventPreview({ isOpen: true, eventData: selectedRow }));
        dispatch(setSelectedEvent(selectedRow));

        router.push("/event-details");
    };

    const getColumnList = () => {
        if (columnSettings) return columnSettings.map((c) => c.key as string);

        const excludeFields: string[] = [];
        if (!viewAdjudicated) excludeFields.push('adjudicatedIds');
        if (tableMode !== 'alarmtable') {
            excludeFields.push('adjudicationGroup', 'secondaryInspection');
        }

        return columns
            .filter((column) => !excludeFields.includes(column.field))
            .map((column) => column.field);
    };

    const handleAlarmFilterChange = useCallback((next: AlarmFilterState) => {
        setAlarmFilter(next);
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, []);

    const handleRowSelection = (params: GridRowParams) => {
        const selectedId = params.row.id;

        if (selectedRowId === selectedId) {
            setSelectionModel([]);
            dispatch(setLatestGB(null));
            dispatch(setSelectedEvent(null));
            dispatch(setSelectedRowId(null));
            dispatch(setEventPreview({ isOpen: false, eventData: null }));
        } else {
            dispatch(setEventPreview({ isOpen: false, eventData: null }));
            setSelectionModel([selectedId]);
            dispatch(setSelectedRowId(selectedId));

            setTimeout(() => {
                const selectedRow = filteredTableData.find((row) => row.id === selectedId);
                if (!selectedRow) return;

                getLatestGB(selectedRow);
                dispatch(setEventPreview({ isOpen: true, eventData: selectedRow }));
                dispatch(setSelectedEvent(selectedRow));
            }, 10);
        }
    };

    async function getLatestGB(eventData: any) {
        for (const lane of laneMap.values()) {
            let datastreams = lane.datastreams.filter((ds: any) => isThresholdDataStream(ds));
            let gammaThreshDs = datastreams.find((ds: typeof DataStream) =>
                ds.properties["system@id"] === eventData.rpmSystemId
            );

            if (gammaThreshDs) {
                let latestGB = await getObservations(eventData.startTime, eventData.endTime, gammaThreshDs);
                dispatch(setLatestGB(latestGB));
            }
        }
    }

    const buildResultTimeQuery = (filterModel: GridFilterModel): string => {
        for (const item of filterModel.items) {
            if (!['startTime', 'endTime'].includes(item.field)) continue;

            const isoDate = new Date(item.value).toISOString();

            // if (item.field === 'startTime') {
            //     if (item.operator === 'after') {
            //         return `${isoDate}/${pageLoadedTime}`
            //     } else if (item.operator === 'before') {
            //         return `../${isoDate}`
            //     }
            // } else if (item.field === 'endTime') {
            //     if (item.operator === 'after') {
            //         return `${isoDate}/${pageLoadedTime}`
            //     } else if (item.operator === 'before') {
            //         return `../${isoDate}`
            //     }
            // }
            if (item.operator === 'after') {
                return `${isoDate}/${pageLoadedTime}`
            } else if (item.operator === 'before') {
                return `../${isoDate}`
            }
        }

        // Widget-configured date window (grid filters take precedence above).
        if (dateRange?.start && dateRange?.end) return `${dateRange.start}/${dateRange.end}`;
        if (dateRange?.start) return `${dateRange.start}/${pageLoadedTime}`;
        if (dateRange?.end) return `../${dateRange.end}`;

        return `../${pageLoadedTime}`;
    }

    const buildAlarmTypeClause = (types: Set<AlarmType>): string | null => {
        if (types.size === 0) return null;
        if (types.size === 4) return null; // all selected — no filter needed

        const clauses: string[] = [];
        if (types.has('Gamma')) clauses.push("(gammaAlarm=true AND neutronAlarm=false)");
        if (types.has('Neutron')) clauses.push("(gammaAlarm=false AND neutronAlarm=true)");
        if (types.has('Gamma & Neutron')) clauses.push("(gammaAlarm=true AND neutronAlarm=true)");
        if (types.has('None')) clauses.push("(gammaAlarm=false AND neutronAlarm=false)");
        if (clauses.length === 0) return null;
        return clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`;
    };

    const buildAdjudicationClause = (groups: Set<AdjudicationGroup>): string | null => {
        const onlyNotAdjudicated = groups.size === 1 && groups.has('Not Adjudicated');
        const hasNotAdjudicated = groups.has('Not Adjudicated');
        const adjudicatedGroupsSelected = Array.from(groups).filter(g => g !== 'Not Adjudicated').length > 0;

        if (onlyNotAdjudicated) return "adjudicatedIdsCount=0";
        if (adjudicatedGroupsSelected && !hasNotAdjudicated) return "adjudicatedIdsCount>0";
        return null;
    };

    const buildAlarmFilterQuery = (state: AlarmFilterState): string => {
        const clauses: string[] = [];
        const alarmClause = buildAlarmTypeClause(state.alarmTypes);
        if (alarmClause) clauses.push(alarmClause);
        const adjClause = buildAdjudicationClause(state.adjudicationGroups);
        if (adjClause) clauses.push(adjClause);
        return clauses.join(" AND ");
    };

    /** Server-side filter clauses from widget config (status + adjudicated). */
    const buildWidgetConfigClauses = (): string[] => {
        const clauses: string[] = [];
        if (statusFilter && statusFilter.length > 0 && statusFilter.length < 4) {
            const clause = buildAlarmTypeClause(new Set(statusFilter as AlarmType[]));
            if (clause) clauses.push(clause);
        }
        if (adjudicatedFilter === 'yes') clauses.push('adjudicatedIdsCount>0');
        if (adjudicatedFilter === 'no') clauses.push('adjudicatedIdsCount=0');
        return clauses;
    };

    const buildFilterQuery = (filterModel: GridFilterModel, tableMode: string): string => {
        const widgetClauses = buildWidgetConfigClauses();

        if (tableMode === 'alarmtable') {
            const base = buildAlarmFilterQuery(alarmFilter);
            return [base, ...widgetClauses].filter(Boolean).join(" AND ");
        }

        let filter: string | null = null;

        for (const item of filterModel.items) {
            if (!['status', 'adjudicatedIds'].includes(item.field))
                continue;

            switch (item.field) {
                case 'status':
                    if (item.value === 'Gamma') {
                        filter =`gammaAlarm=true AND neutronAlarm=false`
                    } else if (item.value === 'Neutron') {
                        filter =`gammaAlarm=false AND neutronAlarm=true`
                    } else if (item.value === 'Gamma & Neutron') {
                        filter =`gammaAlarm=true AND neutronAlarm=true`
                    } else if (item.value === 'None') {
                        filter =`gammaAlarm=false AND neutronAlarm=false`
                    }
                    break;
                case 'adjudicatedIds':
                    if (item.value === 'Yes')
                        filter =`adjudicatedIdsCount>0`
                    else if (item.value === 'No')
                        filter =`adjudicatedIdsCount=0`
                    break;
            }
        }

        return [filter, ...widgetClauses].filter(Boolean).join(" AND ");
    }

    const handleFilterChange = useCallback((model: GridFilterModel) => {
        setFilterModel(model);
        setPaginationModel(prev => ({ ...prev, page: 0 }));
    }, []);

    return (
        <Box sx={{ height: tableHeight, width: '100%' }}>
            <DataGrid
                rows={filteredTableData}
                paginationMode="server"
                filterMode="server"
                filterModel={filterModel}
                onFilterModelChange={handleFilterChange}
                loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={handlePaginationChange}
                rowCount={rowCount}
                columns={orderedColumns}
                {...(columnSettings ? {
                    columnVisibilityModel,
                    onColumnVisibilityModelChange: (model: GridColumnVisibilityModel) => {
                        setColumnVisibilityModel(model);
                        onColumnVisibilityChange?.(model);
                    },
                } : {})}
                onRowClick={handleRowSelection}
                onRowDoubleClick={handleRowDoubleClick}
                rowSelectionModel={selectionModel}
                pageSizeOptions={[15]}
                slots={{ toolbar: CustomToolbar }}
                slotProps={{
                    columnsManagement: {
                        getTogglableColumns: getColumnList,
                    },
                    toolbar: tableMode === 'alarmtable' ? {
                        alarmFilter,
                        onAlarmFilterChange: handleAlarmFilterChange,
                        defaultAlarmFilter: DEFAULT_ALARM_FILTER
                    } : {}
                }}
                initialState={{
                    sorting: {
                        sortModel: [{field: 'startTime', sort: 'desc'}]
                    },
                    columns: {
                        // Manage visible columns in table based on component parameters
                        columnVisibilityModel: {
                            adjudicatedIds: viewAdjudicated && tableMode !== 'alarmtable',
                            adjudicationGroup: tableMode === 'alarmtable',
                            secondaryInspection: tableMode === 'alarmtable',
                        },
                    },
                }}
                autosizeOptions={{
                    expand: true,
                    includeOutliers: true,
                    includeHeaders: false,
                }}
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    if (params.field === "adjudicationGroup") {
                        if (params.value === "Real Alarm") return "highlightReal";
                        if (params.value === "Innocent Alarm") return "highlightInnocent";
                        if (params.value === "False Alarm") return "highlightFalse";
                        if (params.value === "Test/Maintenance" || params.value === "Tamper/Fault" || params.value === "Other") return "highlightOther";
                        return '';
                    }
                    if (params.value === "Gamma")
                        return "highlightGamma";
                    else if (params.value === "Neutron")
                        return "highlightNeutron";
                    else if (params.value === "Gamma & Neutron" || (params.value !== "None" && params.field === "status"))
                        return "highlightGammaNeutron";
                    else if (params.formattedValue === 'Code 1: Contraband Found' || params.formattedValue === 'Code 2: Other' || params.formattedValue === 'Code 3: Medical Isotope Found')
                        return "highlightReal";
                    else if (params.formattedValue === 'Code 4: Norm Found' || params.formattedValue === 'Code 5: Declared Shipment of Radioactive Material' || params.formattedValue === 'Code 6: Physical Inspection Negative')
                        return "highlightInnocent";
                    else if (params.formattedValue === 'Code 7: RIID/ASP Indicates Background Only' || params.formattedValue === 'Code 8: Other' || params.formattedValue === 'Code 9: Authorized Test, Maintenance, or Training Activity')
                        return "highlightFalse";
                    else if (params.formattedValue === 'Code 10: Unauthorized Activity' || params.formattedValue === 'Code 11: Other')
                        return "highlightOther";
                    return '';
                }}
                getRowClassName={(params) =>
                    selectionModel.includes(params.row.id) ? 'selected-row' : ''
                }
                sx={{
                    [`.${gridClasses.row}.selected-row`]: {
                        backgroundColor: 'rgba(33, 150, 243, 0.5)',
                    },
                    [`.${gridClasses.cell}.highlightGamma`]: {
                        backgroundColor: "error.main",
                        color: "error.contrastText",
                    },
                    [`.${gridClasses.cell}.highlightNeutron`]: {
                        backgroundColor: "info.main",
                        color: "info.contrastText",
                    },
                    [`.${gridClasses.cell}.highlightGammaNeutron`]: {
                        backgroundColor: "secondary.main",
                        color: "secondary.contrastText",
                    },
                    [`.${gridClasses.cell}.highlightReal`]: {
                        color: "error.dark",
                    },
                    [`.${gridClasses.cell}.highlightInnocent`]: {
                        color: "primary.dark",
                    },
                    [`.${gridClasses.cell}.highlightFalse`]: {
                        color: "success.dark",
                    },
                    [`.${gridClasses.cell}.highlightOther`]: {
                        color: "text.primary",
                    },
                    border: "none",
                }}
            />
        </Box>
    );
}
