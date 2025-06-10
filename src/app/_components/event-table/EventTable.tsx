"use client"

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useCallback, useEffect, useState} from "react";
import {Box} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {
    setEventPreview,
    setSelectedRowId,
    selectSelectedRowId, setLatestGB
} from "@/lib/state/EventPreviewSlice";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import {AlarmTableData, EventTableData} from "@/lib/data/oscar/TableHelpers";
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
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    addEventToLog,
    selectEventTableDataArray,
    setEventLogData,
    setSelectedEvent
} from "@/lib/state/EventDataSlice";
import {useRouter} from "next/navigation";
import {getObservations} from "@/app/utils/ChartUtils";
import {isThresholdDatastream} from "@/lib/data/oscar/Utilities";


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
    const dispatch = useAppDispatch();
    const router = useRouter();

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});
        let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty("http://www.opengis.net/def/pillar-occupancy-count");

        if (!occDS) {
            return;
        }

        let obsCollection = await occDS[0].searchObservations(observationFilter, 15);

        return await handleObservations(obsCollection, laneEntry, false);
    }

    async function streamObservations(laneEntry: LaneMapEntry) {

        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);
        let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty("http://www.opengis.net/def/pillar-occupancy-count");

        const observationFilter = new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`});
        occDS[0].streamObservations(observationFilter, (observation: any) => {
            let resultEvent = eventFromObservation(observation[0], laneEntry);
            dispatch(addEventToLog(resultEvent));

        })
    }

    //Pseudorandom number generator from event data
    function prngFromStr(obs: any, laneName: string): number {
        const baseId = `${obs.result?.occupancyCount}${laneName}${obs.result?.startTime}${obs.result?.endTime}`;
        return hashString(baseId);
    }

    function hashString(str: any) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 33) ^ str.charCodeAt(i);
        }
        return (hash >>> 0) / 4294967296;
    }


    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<EventTableData[]> {
        let observations: EventTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                let result = eventFromObservation(obs, laneEntry);
                observations.push(result);
                // when fetching, this operation is a bit too costly, so we probably want to just set the table with all the results we've collected
                if (addToLog) dispatch(addEventToLog(result));
            })
        }
        return observations;
    }

    function eventFromObservation(obs: any, laneEntry: LaneMapEntry): EventTableData {
        const id = prngFromStr(obs, laneEntry.laneName);
        let newEvent: EventTableData = new EventTableData(id, laneEntry.laneName, obs.result, obs.id, obs.foiId);

        newEvent.setRPMSystemId(laneEntry.lookupSystemIdFromDataStreamId(obs[`datastream@id`]));

        // newEvent.setLaneSystemId(laneEntry.lookupParentSystemFromSystemId(newEvent.rpmSystemId));
        newEvent.setDataStreamId(obs["datastream@id"]);
        newEvent.setFoiId(obs["foi@id"]);
        newEvent.setObservationId(obs.id);

        return newEvent;
    }

    async function doFetch(laneMap: Map<string, LaneMapEntry>) {

        let allFetchedResults: EventTableData[] = [];
        let promiseGroup: Promise<void>[] = [];

        const laneMapToMap = convertToMap(laneMap);
        // createDatastreams(laneMap)
        laneMapToMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 1);
                let fetchedResults = await fetchObservations(entry, startTimeForObs.toISOString(), 'now')
                allFetchedResults = [...allFetchedResults, ...fetchedResults];

            })();
            promiseGroup.push(promise);
        });

        await Promise.all(promiseGroup);
        dispatch(setEventLogData(allFetchedResults))
    }

    const convertToMap = (obj: any) =>{
        if(!obj) return new Map();
        if(obj instanceof Map) return obj;
        return new Map(Object.entries(obj));
    }

    function doStream(laneMap: Map<string, LaneMapEntry>) {
        const laneMapToMap = convertToMap(laneMap);

        laneMapToMap.forEach((entry) => {
            streamObservations(entry);
        })
    }

    function unadjudicatedFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        return tableData.filter((entry) => {
            if (entry.isAdjudicated) return false;
            return entry.adjudicatedData.adjudicationCode.code === 0;

        })

    }

    function onlyAlarmingFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        return  tableData.filter((entry: EventTableData) => entry.status !== 'None')

    }


    function laneEventList(tableData: EventTableData[]){
        let filteredData: EventTableData[] = [];

        filteredData = tableData.filter((entry: EventTableData) => entry.laneId == currentLane)
        return filteredData;
    }


    useEffect(() => {
        console.log("laneMap changed size", laneMap)
        dataStreamSetup(laneMap);
    }, [laneMap, laneMap.size]);

    const dataStreamSetup = useCallback(async (laneMap: Map<string, LaneMapEntry>) => {
        await doFetch(laneMap);
        doStream(laneMap);
    }, [laneMap]);

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
        //should we set the event preview open here using dispatch?
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
                onRowClick={handleRowSelection}

                rowSelectionModel={selectionModel}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 15,
                        },
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
                pageSizeOptions={[15]}
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
                    // '& .MuiDataGrid-row:hover': {
                    //     backgroundColor: 'rgba(33,150,243,0.5)',
                    // },
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