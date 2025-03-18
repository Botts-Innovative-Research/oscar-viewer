"use client"

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useCallback, useEffect, useState} from "react";
import {Box} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {
    setEventPreview,
    setSelectedRowId,
    selectSelectedRowId,
    selectEventPreview
} from "@/lib/state/EventPreviewSlice";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataGrid, GridActionsCellItem, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    addEventToLog,
    selectEventTableDataArray, selectSelectedEvent,
    setEventLogData,
    setSelectedEvent
} from "@/lib/state/EventDataSlice";
import {useRouter} from "next/navigation";
import {makeStyles} from "@mui/styles";


interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "eventLogPerLane";
    viewSecondary?: boolean;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
    laneMap: Map<string, LaneMapEntry>;
}

const selectedRowStyles = makeStyles({
    selectedRow: {
        backgroundColor: 'rgba(33,150,243,0.5) !important',
    },
});

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
export default function Table2({
                                   tableMode,
                                   viewSecondary = false,
                                   // viewMenu = false,
                                   viewLane = false,
                                   viewAdjudicated = false,
                                   laneMap,

                               }: TableProps) {

    const tableData = useSelector((state: RootState) => selectEventTableDataArray(state))
    const [filteredTableData, setFilteredTableData] = useState<EventTableData[]>([]);
    const [selectionModel, setSelectionModel] = useState([]); // Currently selected row
    const dispatch = useAppDispatch();
    const router = useRouter();
    const classes = selectedRowStyles();
    const selectedRowId = useSelector(selectSelectedRowId);

    const eventPreview = useSelector(selectEventPreview)
    const selectedEvent = useSelector(selectSelectedEvent)

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});
        let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty("http://www.opengis.net/def/pillar-occupancy-count");

        if (!occDS) {
            return;
        }
        let obsCollection = await occDS.searchObservations(observationFilter, 250000);
        return await handleObservations(obsCollection, laneEntry, false);
    }

    async function streamObservations(laneEntry: LaneMapEntry) {

        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);
        let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty("http://www.opengis.net/def/pillar-occupancy-count");
        occDS.streamObservations(new ObservationFilter({
            resultTime: `now/${futureTime.toISOString()}`
        }), (observation: any) => {
            let resultEvent = eventFromObservation(observation[0], laneEntry);
            dispatch(addEventToLog(resultEvent));

        })
    }


    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<EventTableData[]> {
        let observations: EventTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                let result = eventFromObservation(obs, laneEntry);
                observations.push(result);
                // when fetching, this operation is a bit too costly so we probably want to just set the table with all the results we've collected
                if (addToLog) dispatch(addEventToLog(result));
            })
        }
        return observations;
    }

    function eventFromObservation(obs: any, laneEntry: LaneMapEntry): EventTableData {
        let newEvent: EventTableData = new EventTableData(randomUUID(), laneEntry.laneName, obs.result, obs.id, obs.foiId);
        newEvent.setSystemIdx(laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId));
        newEvent.setDataStreamId(obs["datastream@id"]);
        newEvent.setFoiId(obs["foi@id"]);
        newEvent.setObservationId(obs.id);

        return newEvent;
    }

    async function doFetch(laneMap: Map<string, LaneMapEntry>) {
        let allFetchedResults: EventTableData[] = [];
        let promiseGroup: Promise<void>[] = [];

        // createDatastreams(laneMap)
        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 1);
                await fetchObservations(entry, startTimeForObs.toISOString(), 'now')
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

    function onlyLaneFilteredList(tableData: EventTableData[], laneId: string) {
        if (!tableData) return [];
        return tableData.filter((entry: EventTableData) => entry.laneId == laneId)

    }


    useEffect(() => {
        dataStreamSetup(laneMap);
    }, [laneMap]);

    const dataStreamSetup = useCallback(async (laneMap: Map<string, LaneMapEntry>) => {
        await doFetch(laneMap);
        doStream(laneMap);
    }, [laneMap]);

    useEffect(() => {
        let filteredData: EventTableData[] = [];
        if (tableMode === 'alarmtable') {
            filteredData = unadjudicatedFilteredList(onlyAlarmingFilteredList(tableData))
        } else if (tableMode === 'eventlog') {
            if (laneMap.size === 1) {
                const laneId = Array.from(laneMap.keys())[0];
                filteredData = onlyLaneFilteredList(tableData, laneId)
            }
        }else if(tableMode === 'eventLogPerLane'){
            if (laneMap.size === 1) {
                const laneId = Array.from(laneMap.keys())[0];
                filteredData = onlyLaneFilteredList(tableData, laneId)
            }
        }
        // setFilteredTableData(filteredData);
        setFilteredTableData((prevState) => {
            return filteredData;
        })
    }, [tableData]);

    // useEffect(() => {
    //     if (eventPreview.isOpen && eventPreview.eventData) {
    //         setSelectionModel([selectedRowId]);
    //     } else {
    //         setSelectionModel([]);
    //     }
    // }, [eventPreview.isOpen, eventPreview.eventData]);

    // useEffect(() => {
    //     eventPreview.isOpen ? setSelectionModel([selectedRowId]) : setSelectionModel([]);
    // }, []);

    //------------------------------------------------------------------------------------------------------------------
    // Data Grid Setup and Related
    //------------------------------------------------------------------------------------------------------------------

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
            valueFormatter: (value) => (new Date(value)).toLocaleString(),
            minWidth: 200,
            flex: 2,
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            valueFormatter: (value) => (new Date(value)).toLocaleString(),
            minWidth: 200,
            flex: 2,
        },
        {
            field: 'maxGamma',
            headerName: 'Max Gamma (cps)',
            valueFormatter: (value) => (typeof value === 'number' ? value : 0),
            minWidth: 150,
            flex: 1.2,
        },
        {
            field: 'maxNeutron',
            headerName: 'Max Neutron (cps)',
            valueFormatter: (value) => (typeof value === 'number' ? value : 0),
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
            valueFormatter: (value) => value ? "Yes" : "No",
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



    // Handle currently selected row
    // const handleRowSelection = (selection: any[]) => {
    //     const selectedId = selection[0]; // Get the first selected ID
    //     console.log("ROW SELECTED ID: ", selectedId)
    const handleRowSelection = (selection: any[]) => {

        // console.log("Selection Model", selectionModel);
        // console.log("Row Selected from Rehydrate", selectedRowId)
        //
        // const selectedId = (eventPreview.isOpen) ? selectedRowId : selection[0];
        const selectedId = selection[0];


        if (selectionModel[0] === selectedId) {
            setSelectionModel([]);

            dispatch(setSelectedEvent(null));
            dispatch(setSelectedRowId(null));
            dispatch(setEventPreview({isOpen: false, eventData: null}));
        } else {
            setSelectionModel([selectedId]);

            dispatch(setSelectedEvent(null));
            dispatch(setSelectedRowId(null));
            dispatch(setEventPreview({isOpen: false, eventData: null}));

            setTimeout(() =>{

                setSelectionModel([selectedId]); // Highlight new row
                dispatch(setSelectedRowId(selectedId));


                const selectedRow = tableData.find((row) => row.id === selectedId);
                if (selectedRow) {
                    dispatch(setEventPreview({ isOpen: true, eventData: selectedRow }));
                    dispatch(setSelectedEvent(selectedRow));
                }
            }, 10)

        }
    };

    return (
        <Box sx={{flex: 1, width: '100%'}}>
            <DataGrid
                rows={filteredTableData}
                columns={columns}
                onRowSelectionModelChange={handleRowSelection}
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
                pageSizeOptions={[20]}
                slots={{toolbar: CustomToolbar}}
                slotProps={{
                    columnsManagement: {
                        getTogglableColumns: getColumnList,
                    }
                }}
                autosizeOnMount
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
                    params.row.id == selectionModel[0] ? classes.selectedRow : ''
                }

                sx={{

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




// useEffect(() => {
//     console.log("SELECTED ROW ID", selectedRowId)
//     console.log("SELECTION MODEL", selectionModel)
//
//     if (!selectedRowId && !eventPreview.isOpen) {
//         setSelectionModel([]);
//     }
//
// }, [selectedRowId]);