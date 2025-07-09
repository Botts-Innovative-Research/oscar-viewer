"use client"

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useCallback, useEffect, useRef, useState} from "react";
import {Box} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {
    setEventPreview,
    setSelectedRowId,
    selectSelectedRowId, setLatestGB
} from "@/lib/state/EventPreviewSlice";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    DataGrid,
    GridActionsCellItem,
    GridCellParams,
    gridClasses,
    GridColDef,
    GridRowParams,
    GridRowSelectionModel,
} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    addEventToLog,
    selectEventTableDataArray, setEventLogData,
    setSelectedEvent
} from "@/lib/state/EventDataSlice";
import {useRouter} from "next/navigation";
import {getObservations} from "@/app/utils/ChartUtils";
import {isThresholdDatastream} from "@/lib/data/oscar/Utilities";
import {selectNodes} from "@/lib/state/OSHSlice";
import {Node} from "@/lib/data/osh/Node";
import { hashString } from "@/app/utils/Utils";
import {GridDataSource, GridGetRowsParams, GridGetRowsResponse} from "@mui/x-data-grid/internals";


interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "lanelog";
    viewSecondary?: boolean;
    currentLane?: string;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
    laneMap: Map<string, LaneMapEntry>;
}


/**
 * Gathers occupancy data both historical and real-time and creates TableEventData entries, which are passed into
 * the child components for further use
 * @param tableMode
 * @param viewSecondary Show 'Secondary Inspection' column, default FALSE
 * @param viewMenu Show three-dot menu button, default FALSE
 * @param viewLane Show 'View Lane' option in menu, default FALSE
 * @param viewAdjudicated shows Adjudicated status in the event log , not shown in the alarm table
 * @param laneMap map of LaneMapEntries to be used by created data sources
 * @constructor
 */
export default function EventTable({
                                       tableMode,
                                       viewSecondary = false,
                                       // viewMenu = false,
                                       viewLane = false,
                                       viewAdjudicated = false,
                                       laneMap,
                                       currentLane

                                   }: TableProps) {

    const selectedRowId = useSelector(selectSelectedRowId);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([selectedRowId]); // Currently selected row
    const tableData = useSelector((state: RootState) => selectEventTableDataArray(state))
    const [filteredTableData, setFilteredTableData] = useState<EventTableData[]>([]);

    // paginated data fetching

    const [loading, setLoading] = useState(false);
    const [paginationModel, setPaginationModel]= useState({page: 0, pageSize: 15});
    const pageOffset = paginationModel.page - 1;
    const [rowCount, setRowCount] = useState<number>(25);
    const [prevPage, setPrevPage]= useState(0);
    const [obsCurrentPage, setObsCurrentPage] = useState(0);
    const dispatch = useAppDispatch();
    const router = useRouter();

    const nodes: Node[] = useSelector(selectNodes);

    const observedProperty = 'http://www.opengis.net/def/pillar-occupancy-count';


    // useEffect(() => {
    //     const startTime = new Date();
    //     startTime.setFullYear(startTime.getFullYear() - 1);
    //
    //     const fetchPage = async () => {
    //         const results = await fetchObservations(startTime.toISOString(), 'now');
    //         setPrevPage(paginationModel.page);
    //
    //         console.log("Setting Filtered Table Data: ", results);
    //         setFilteredTableData(results);
    //         setRowCount(25) // how many pages there are
    //     };
    //
    //     fetchPage();
    //
    // }, [paginationModel]);

    const fetchPage = async () => {
        let allFetchedResults: EventTableData[] = []

        const startTime = new Date();
        startTime.setFullYear(startTime.getFullYear() - 1);
        const results = await fetchObservations(startTime.toISOString(), 'now');

        allFetchedResults = [...allFetchedResults, ...results];

        console.log(`Setting ${tableMode} Data: `, results);
        dispatch(setEventLogData(allFetchedResults));

        setRowCount(1000) // how many total items there are
    };

    const obsCollectionRef = useRef<any>(null);
    //  need to pass the page in here
    //TOTAL OBSERVATIONS === /sensorhub/api/observations/count?observedProperty=http://www.opengis.net/def/pillar-occupancy-count&limit=15
    async function fetchObservations(startTime: string, endTime: string){
        const observationFilter = new ObservationFilter({
            observedProperty: observedProperty,
            // resultTime: `${startTime}/${endTime}`
        });

        if(!nodes?.length) return []

        if(!obsCollectionRef.current){
            // TODO: be able to loop through all nodes
            const node = nodes[0];
            obsCollectionRef.current =  await node.searchObservations(observationFilter, 15);
        }
        const obsCollection = obsCollectionRef.current;

        let results: any = await obsCollection.page(paginationModel.page + 1);

        setObsCurrentPage(obsCollection.currentPage);

        console.log("Results from fetch: ", results);
        console.log(`Pagination page ${paginationModel.page} vs obs collection page ${obsCollection.currentPage}`);
        return await handleObservation(results);


        // if(paginationModel.page >= prevPage && obsCollection.hasNext()){
        //     results = await obsCollection.nextPage();
        //     setObsCurrentPage(obsCollection.currentPage);
        // }else if(paginationModel.page < prevPage && obsCollection.hasPrevious()){
        //     results = await obsCollection.previousPage();
        //     setObsCurrentPage(obsCollection.currentPage);
        // }
        // return await handleObservation(results);
    }

    // @ts-ignore
    async function handleObservation(obsResults: any): Promise<EventTableData[]> {
        let observations: EventTableData[] = [];

        obsResults.map((obs: any) =>{
            laneMap.forEach((entry: LaneMapEntry) => {
                entry.datastreams.forEach((ds:any) =>{
                    if(ds.properties.id === obs.properties['datastream@id']){
                        let result = eventFromObservation(obs, entry, false);
                        observations.push(result)
                    }
                });
            });
        });

        return observations;
    }


    function eventFromObservation(obs: any, laneEntry: LaneMapEntry, isStream: boolean): EventTableData {

        const datastreamId = isStream ? obs["datastream@id"] : obs.properties["datastream@id"];
        const observationId = isStream ? obs.id : obs.properties.id;
        const result = isStream ? obs.result : obs.properties.result;
        const foiId = isStream ? obs["foi@id"] : null;

        const idSrc = `${observationId}-${laneEntry.laneName}-${datastreamId}`;
        const id = hashString(idSrc);

        let newEvent = new EventTableData(id, laneEntry.laneName, result, observationId, foiId);
        newEvent.setRPMSystemId(laneEntry.lookupSystemIdFromDataStreamId(datastreamId));
        newEvent.setDataStreamId(datastreamId);
        newEvent.setObservationId(observationId);
        newEvent.setFoiId(foiId);

        return newEvent;
    }

    // function doStream(laneMap: Map<string, LaneMapEntry>) {
    //     laneMap.forEach((entry) => {
    //         streamObservations(entry);
    //     })
    // }
    // async function streamObservations(laneEntry: LaneMapEntry) {
    //     let futureTime = new Date();
    //     futureTime.setFullYear(futureTime.getFullYear() + 1);
    //     let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty("http://www.opengis.net/def/pillar-occupancy-count");
    //
    //     const observationFilter = new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`});
    //
    //     if(occDS && occDS.length > 0){
    //         occDS[0].streamObservations(observationFilter, (observation: any) => {
    //             let resultEvent = eventFromObservation(observation[0], laneEntry, true);
    //             dispatch(addEventToLog(resultEvent));
    //         })
    //     }
    // }

    function unadjudicatedFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        return tableData.filter((entry) => {
            if (entry.isAdjudicated) return false;
            return entry.adjudicatedData.adjudicationCode.code === 0;
        })
    }

    function onlyAlarmingFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        return tableData.filter((entry: EventTableData) => entry.status !== 'None')
    }

    function laneEventList(tableData: EventTableData[]){
        if (!tableData) return [];
        return tableData.filter((entry: EventTableData) => entry.laneId == currentLane);
    }


    useEffect(() => {
        // laneMap = convertToMap(laneMap);
        dataStreamSetup();
    }, [paginationModel]);

    const dataStreamSetup = useCallback(async () => {
        await fetchPage();
        // doStream(laneMap);
    }, [paginationModel]);


    useEffect(() => {
        let filteredData: EventTableData[] = [];
        if (tableMode === 'alarmtable') {
            filteredData = unadjudicatedFilteredList(onlyAlarmingFilteredList(tableData))
        } else if (tableMode === 'eventlog') {
            filteredData = tableData
        }else if(tableMode === 'lanelog'){
            filteredData = laneEventList(tableData);
        }
        setFilteredTableData(filteredData);
    }, [tableData]);


    //------------------------------------------------------------------------------------------------------------------
    // Data Grid Setup and Related
    //------------------------------------------------------------------------------------------------------------------

    const locale = navigator.language || 'en-US';

    // Column definition for EventTable
    const columns: GridColDef<EventTableData>[] = [
        {
            field: 'secondaryInspection',
            headerName: 'Secondary Inspection',
            type: 'boolean',
            minWidth: 125,
            flex: 1,
            filterable: viewSecondary
        },
        {
            field: 'laneId',
            headerName: 'Lane ID',
            type: 'string',
            minWidth: 100,
            flex: 1,
        },
        {
            field: 'occupancyId',
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
            field: 'isAdjudicated',
            headerName: 'Adjudicated',
            valueFormatter: (params) => params ? "Yes" : "No",
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
                        icon={<VisibilityRoundedIcon />}
                        label="Details"
                        onClick={() => handleEventPreview()}
                        showInMenu
                    />
                ) : <></>,
            ],
        },
    ];

    const handleEventPreview = () =>{
        router.push("/event-details")
    }

    // Manage list of columns in toggle menu
    const getColumnList = () => {
        const excludeFields: string[] = [];
        // Exclude fields based on component parameters
        if (!viewSecondary) excludeFields.push('secondaryInspection');
        if (!viewAdjudicated) excludeFields.push('isAdjudicated');
        // if (!viewAdjudicated) excludeFields.push('adjudicatedCode');

        return columns
            .filter((column) => !excludeFields.includes(column.field))
            .map((column) => column.field);
    }

    useEffect(() => {
        if(!selectedRowId){
            setSelectionModel([])
        }
    }, [selectedRowId]);

    const handleRowSelection = (params: GridRowParams) => {
        const selectedId = params.row.id;

        if (selectedRowId === selectedId) {
            setSelectionModel([]);

            dispatch(setLatestGB(null));
            dispatch(setSelectedEvent(null));
            dispatch(setSelectedRowId(null));
            dispatch(setEventPreview({isOpen: false, eventData: null}));
        } else {

            dispatch(setEventPreview({isOpen: false, eventData: null})); //clear before setting new data

            setSelectionModel([selectedId]); // Highlight new row
            dispatch(setSelectedRowId(selectedId));

            setTimeout(() =>{
                const selectedRow = filteredTableData.find((row) => row.id === selectedId);
                if(!selectedRow) return;

                getLatestGB(selectedRow)
                dispatch(setEventPreview({ isOpen: true, eventData: selectedRow }));
                dispatch(setSelectedEvent(selectedRow));
            }, 10)
        }
    };

    async function getLatestGB(eventData: any){
        for (const lane of laneMap.values()){
            let datastreams = lane.datastreams.filter((ds: any) => isThresholdDatastream(ds));
            let gammaThreshDs = datastreams.find((ds: typeof DataStream) => ds.properties["system@id"] == eventData.rpmSystemId);
            if(gammaThreshDs){
                let latestGB = await getObservations(eventData.startTime, eventData.endTime, gammaThreshDs);
                dispatch(setLatestGB(latestGB));
            }
        }
    }


    return (
        <Box sx={{flex: 1, width: '100%', height: 800}}>
            <DataGrid
                rows={filteredTableData}
                columns={columns}
                pagination
                paginationMode="server"
                // loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                onRowClick={handleRowSelection}
                rowSelectionModel={selectionModel}
                rowCount={rowCount}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 15,
                        }
                    },
                    columns: {
                        // Manage visible columns in table based on component parameters
                        columnVisibilityModel: {
                            secondaryInspection: viewSecondary,
                            isAdjudicated: viewAdjudicated,
                            // adjudicatedCode: viewAdjudicated,

                        },
                    },
                    sorting: {
                        sortModel: [{field: 'startTime', sort: 'desc'}]
                    },
                }}
                slots={{toolbar: CustomToolbar}}
                slotProps={{
                    columnsManagement: {
                        getTogglableColumns: getColumnList,
                    }
                }}
                autosizeOptions={{
                    expand: true,
                    includeOutliers: true,
                    includeHeaders: false,
                }}
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    // Assign className for styling to 'Status' column based on value
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
                    else
                        return '';


                }}

                getRowClassName={(params) =>
                    selectionModel.includes(params.row.id) ? 'selected-row' : ''
                }
                sx={{
                    // assign color styling to selected row
                    [`.${gridClasses.row}.selected-row`]: {
                        backgroundColor: 'rgba(33,150,243,0.5)',
                    },
                    // Assign styling to 'Status' column based on className
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
    )
}

