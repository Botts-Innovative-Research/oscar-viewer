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
    DataGrid,
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
import {setSelectedEvent} from "@/lib/state/EventDataSlice";
import { useRouter } from "next/dist/client/components/navigation";
import { getObservations } from "@/app/utils/ChartUtils";
import { isOccupancyDataStream, isThresholdDataStream } from "@/lib/data/oscar/Utilities";
import { convertToMap, hashString } from "@/app/utils/Utils";
import { OCCUPANCY_PILLAR_DEF } from "@/lib/data/Constants";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import { selectNodes } from "@/lib/state/OSHSlice";
import { EventType } from "osh-js/source/core/event/EventType";
import {INode} from "@/lib/data/osh/Node";
import Observations from "osh-js/source/core/consysapi/observation/Observations";

interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "lanelog";
    viewSecondary?: boolean;
    currentLane?: string;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
    laneMap: Map<string, LaneMapEntry>;
}

interface PaginationState {
    collections: Map<string, any>; // nodeId -> collection
    currentPage: number;
    hasMore: boolean;
}

export default function EventTable({
                                       tableMode,
                                       viewLane = false,
                                       viewAdjudicated = false,
                                       laneMap,
                                       currentLane,
                                   }: TableProps) {

    const nodes = useSelector(selectNodes);
    const selectedRowId = useSelector(selectSelectedRowId);
    const [loading, setLoading] = useState(false);
    const pageSize = 15;
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: pageSize });
    const [rowCount, setRowCount] = useState(0);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([selectedRowId]);
    const [filteredTableData, setFilteredTableData] = useState<EventTableData[]>([]);
    const [totalCount, setTotalCount] = useState<Map<string, number>>(new Map());
    const [currentPage, setCurrentPage] = useState(0);


    const dispatch = useAppDispatch();
    const router = useRouter();


    const stableLaneMap = useMemo(() => convertToMap(laneMap), [laneMap]);

    console.log(laneMap)

    const getDatastreamIds = useCallback((node: any): string[] => {
        const datastreamIds: string[] = [];
        stableLaneMap.forEach((entry: LaneMapEntry) => {
            if (entry.parentNode.id === node.id) {
                const occStreams = entry.datastreams.filter(ds => isOccupancyDataStream(ds));
                for (const ds of occStreams) {
                    datastreamIds.push(ds.properties.id);
                }
            }
        });
        return datastreamIds;
    }, [stableLaneMap]);

    const filterRows = useCallback((rows: EventTableData[]): EventTableData[] => {
        switch (tableMode) {
            case 'alarmtable':
                // Only show alarming events that are not adjudicated
                return rows.filter(row => row.status !== 'None' && row.adjudicatedData?.adjudicationCode?.code === 0);
            case 'lanelog':
                // Only show events for the current lane
                return rows.filter(row => row.laneId === currentLane);
            case 'eventlog':
                // shows all events
            default:
                return rows;
        }
    }, [tableMode, currentLane]);

    useEffect(() => {
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

        fetchAllCounts();
    }, [nodes, stableLaneMap]);

    const totalObservations = useMemo(() => {
        let sum = 0;
        totalCount.forEach(count => sum += count);
        return sum;
    }, [totalCount]);

    const totalPages = Math.ceil(totalObservations / pageSize);

    const [pageLoadedTime] = useState(() => new Date().toISOString());

    const fetchPage = useCallback(async (userRequestedPage: number): Promise<boolean> => {
        if (stableLaneMap.size === 0 || nodes.size === 0 || totalPages === 0)
            return;

        setLoading(true);

        try {
            //items per page = 15
            // total items  = 190is
            // target page =
            // total pages = total items/ items per page
            // user requested page  = 0 (pagination page based on table)
            // api page = total pages - user requested page - 1 (bc we do the nextPage())
            const apiPage = totalPages - 1 - userRequestedPage;
            const pageOffset = apiPage * pageSize;

            const allRows: EventTableData[] = [];

            for (const node of nodes) {
                const datastreamIds = getDatastreamIds(node);
                if (datastreamIds.length === 0) continue;

                const observationFilter = new ObservationFilter({
                    dataStream: datastreamIds,
                    resultTime: `../${pageLoadedTime}`
                });

                const obsApi: typeof Observations = await node.getObservationsApi();
                const obsCollection = await obsApi.searchObservations(observationFilter, pageSize, 0);


                const results = await obsCollection.page(apiPage);
                for (const obs of results) {
                    const laneEntry = findLaneByDataStreamId(stableLaneMap, obs.properties["datastream@id"]);
                    if (!laneEntry) continue;

                    const evt = eventFromObservation(obs, laneEntry, false);
                    allRows.push(evt);
                }

                const deduped = dedepulicateById(allRows);
                const filtered = filterRows(deduped);

                setFilteredTableData(filtered);
                setCurrentPage(userRequestedPage);
            }
        } catch (error) {
            console.error("Error fetching observations,", error)
            setFilteredTableData([])
        } finally {
            setLoading(false);
        }

    }, [nodes, stableLaneMap, totalPages]);

    function dedepulicateById(arr: EventTableData[]): EventTableData[] {
        const map = new Map();
        for (const row of arr) map.set(row.id, row);
        return [...map.values()];
    }

    useEffect(() => {
        if (totalPages > 0)
            fetchPage(paginationModel.page)
    }, [paginationModel.page, paginationModel.pageSize, stableLaneMap, nodes, totalPages]);


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
        let queryParams = `/observations/count?resultTime=../now&format=application/om%2Bjson&dataStream=${datastreamIds.join(",")}`
        let fullUrl = endpoint + queryParams;

        console.log("full url", fullUrl)
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

            console.log("response json count", responseJson)
            return responseJson.count || 0;
        } catch (error) {
            console.error("Error fetching total observation count", error);
            return 0;
        }
    }

    function eventFromObservation(obs: any, laneEntry: LaneMapEntry, isLive: boolean): EventTableData {
        const id = prngFromStr(obs, laneEntry.laneName);
        let newEvent: EventTableData;

        if (isLive) {
            // Handle live observations
            const result = obs.result || obs;
            newEvent = new EventTableData(id, laneEntry.laneName, result, null, obs["foi@id"] || obs.foiId);
            newEvent.setDataStreamId(obs["datastream@id"]);
            newEvent.setFoiId(obs["foi@id"] || obs.foiId);
        } else {
            // Handle historical observations
            newEvent = new EventTableData(id, laneEntry.laneName, obs.properties.result, obs.properties.id, obs.properties.foiId);
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
        if (stableLaneMap.size === 0) {
            return;
        }

        const connectedSources: typeof ConSysApi[] = [];

        for (const entry of stableLaneMap.values()) {
            const occStream: typeof DataStream = entry.findDataStreamByObsProperty(OCCUPANCY_PILLAR_DEF);

            if (!occStream) {
                continue;
            }

            const occSource = entry.datasourcesRealtime?.find((ds: any) => {
                const parts = ds.properties.resource?.split("/");
                return parts && parts[2] === occStream.properties.id;
            });

            if (!occSource) {
                continue;
            }

            const handleMessage = (msg: any) => {
                try {
                    const obsData = msg.values?.[0]?.data || msg;
                    const event = eventFromObservation(obsData, entry, true);
                    const dsObsPath = occSource.properties.resource;
                    if (dsObsPath) {
                        event.setDataStreamId(dsObsPath.split("/")[2]);
                    }

                    const filtered = filterRows([event]);
                    if (filtered.length === 0) return;

                    if (currentPage === 0) {
                        setFilteredTableData(prev => {
                            const exists = prev.some(row => row.id === event.id);
                            if (exists) return prev;
                            return [event, ...prev].slice(0, pageSize);
                        });
                        setRowCount(prev => prev + 1);
                    }
                } catch (err) {
                    console.error("Error creating event from observation:", err);
                }
            };

            occSource.subscribe(handleMessage, [EventType.DATA]);

            try {
                occSource.connect();
                connectedSources.push(occSource);
            } catch (err) {
                console.error("Error connecting occSource:", err);
            }
        }
    }, [stableLaneMap, dispatch, filterRows]);

    // Clear selection when selectedRowId changes externally
    useEffect(() => {
        if (!selectedRowId) {
            setSelectionModel([]);
        }
    }, [selectedRowId]);

    const locale = navigator.language || 'en-US';

    const columns: GridColDef<EventTableData>[] = [
        {
            field: 'laneId',
            headerName: 'Lane ID',
            type: 'string',
            minWidth: 100,
            flex: 1,
        },
        {
            field: 'occupancyCount',
            headerName: 'Occupancy ID',
            type: 'string',
            minWidth: 125,
            flex: 1.5,
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
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
        },
        {
            field: 'endTime',
            headerName: 'End Time',
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
        },
        {
            field: 'maxGamma',
            headerName: 'Max Gamma (cps)',
            valueFormatter: (params) => (typeof params === 'number' ? params : 0),
            minWidth: 150,
            flex: 1.2,
        },
        {
            field: 'maxNeutron',
            headerName: 'Max Neutron (cps)',
            valueFormatter: (params) => (typeof params === 'number' ? params : 0),
            minWidth: 150,
            flex: 1.2,
        },
        {
            field: 'status',
            headerName: 'Status',
            type: 'string',
            minWidth: 125,
            flex: 1.2,
        },
        {
            field: 'adjudicatedIds',
            headerName: 'Adjudicated',
            valueFormatter: (params: any) => params.length > 0 ? "Yes" : "No",
            minWidth: 100,
            flex: 1,
            filterable: viewAdjudicated
        },
        {
            field: 'Menu',
            headerName: '',
            type: 'actions',
            minWidth: 50,
            flex: 0.5,
            getActions: (params) => [
                selectionModel.includes(params.row.id) ? (
                    <GridActionsCellItem
                        key="details"
                        icon={<VisibilityRoundedIcon />}
                        label="Details"
                        onClick={() => handleEventPreview()}
                        showInMenu
                    />
                ) : <></>,
            ],
        },
    ];

    const handleEventPreview = () => {
        router.push("/event-details");
    };

    const getColumnList = () => {
        const excludeFields: string[] = [];
        if (!viewAdjudicated) excludeFields.push('adjudicatedIds');

        return columns
            .filter((column) => !excludeFields.includes(column.field))
            .map((column) => column.field);
    };

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

    return (
        <Box sx={{ height: 800, width: '100%' }}>
            <DataGrid
                rows={filteredTableData}
                paginationMode="server"
                loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowCount={rowCount}
                columns={columns}
                onRowClick={handleRowSelection}
                rowSelectionModel={selectionModel}
                pageSizeOptions={[15]}
                slots={{ toolbar: CustomToolbar }}
                slotProps={{
                    columnsManagement: {
                        getTogglableColumns: getColumnList,
                    }
                }}
                initialState={{
                    sorting: {
                        sortModel: [{field: 'startTime', sort: 'desc'}]
                    }
                }}
                autosizeOptions={{
                    expand: true,
                    includeOutliers: true,
                    includeHeaders: false,
                }}
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    if (params.value === "Gamma")
                        return "highlightGamma";
                    else if (params.value === "Neutron")
                        return "highlightNeutron";
                    else if (params.value === "Gamma & Neutron")
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