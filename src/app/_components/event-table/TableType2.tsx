"use client";

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useEffect, useState} from "react";
import {Box} from "@mui/material";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap, setEventPreview} from "@/lib/state/OSCARClientSlice";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    DataGrid,
    GridActionsCellItem,
    GridCellParams,
    gridClasses,
    GridColDef,
    GridLogicOperator
} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import NotesRoundedIcon from "@mui/icons-material/NotesRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {useAppDispatch} from "@/lib/state/Hooks";


interface TableProps {
    tableMode: "eventlog" | "alarmtable";
    viewSecondary?: boolean;
    viewMenu?: boolean;
    viewLane?: boolean;
    viewAdjudicated?: boolean;
}

/**
 * Gathers occupancy data both historical and real-time and creates TableEventData entries, which are passed into
 * the child components for further use
 * @param tableMode
 * @param viewSecondary Show 'Secondary Inspection' column, default FALSE
 * @param viewMenu Show three-dot menu button, default FALSE
 * @param viewLane Show 'View Lane' option in menu, default FALSE
 * @param viewAdjudicated shows Adjudicated status in the event log , not shown in the alarm table
 * @constructor
 */
export default function Table2({
                                   tableMode,
                                   viewSecondary = false,
                                   viewMenu = false,
                                   viewLane = false,
                                   viewAdjudicated = false
                               }: TableProps) {
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))
    const [tableData, setTableData] = useState<EventTableData[]>([]);
    // const viewAdjudicated = viewAdjudicated || false;
    // const viewSecondary = viewSecondary || false;
    // const viewMenu = viewMenu || false;
    // const viewLane = viewLane || false;
    const [selectionModel, setSelectionModel] = useState([]); // Currently selected row
    const dispatch = useAppDispatch();

    // gather all occupancy dataStreams
    function createDatastreams(lanes: Map<string, LaneMapEntry>) {
        for (let [laneName, laneEntry] of lanes.entries()) {
            console.log("LaneEntry Datastreams", laneEntry.datastreams)
            let filteredDatastreams = laneEntry.datastreams.filter((ds: typeof DataStream) => ds.properties.name.includes("Occupancy"));
            console.log("LaneEntry Filtered Datastreams", filteredDatastreams);
        }
    }

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});
        let occDS: typeof DataStream = laneEntry.findDataStreamByName("Driver - Occupancy");
        if (!occDS) {
            return;
        }
        let obsCollection = await occDS.searchObservations(observationFilter, 250000);
        let observations = await handleObservations(obsCollection, laneEntry);
        return observations;
    }

    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry): Promise<EventTableData[]> {
        let observations: EventTableData[] = [];
        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                let newEvent: EventTableData = new EventTableData(randomUUID(), laneEntry.laneName, obs.result);
                newEvent.setSystemIdx(laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId));
                newEvent.setDataStreamId(obs["datastream@id"]);
                newEvent.setObservationId(obs.id);
                console.log("[EVT] New Event Table Data", newEvent);
                observations.push(newEvent);
            })
        }
        return observations;
    }

    async function setUpDataRetrieval(laneMap: Map<string, LaneMapEntry>) {
        let allFetchedResults: EventTableData[] = [];
        let promiseGroup: Promise<void>[] = [];
        // createDatastreams(laneMap)
        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 1);
                let fetchedResults = await fetchObservations(entry, startTimeForObs.toISOString(), 'now')
                allFetchedResults = [...allFetchedResults, ...fetchedResults];
            })();
            promiseGroup.push(promise);
        });
        await Promise.all(promiseGroup);
        setTableData(allFetchedResults);
    }

    useEffect(() => {
        setUpDataRetrieval(laneMap);
    }, [laneMap]);

    useEffect(() => {
        console.log('[EVT] Table Data Updated', tableData)
    }, [tableData]);


    /*------------------------------------------------------------------------------------------------------------------
    Data Drid Setup and Related
     -----------------------------------------------------------------------------------------------------------------*/

    // Column definition for EventTable
    const columns: GridColDef<EventTableData>[] = [
        {
            field: 'secondaryInspection',
            headerName: 'Secondary Inspection',
            type: 'boolean',
        },
        {
            field: 'laneId',
            headerName: 'Lane ID',
            type: 'string',
        },
        {
            field: 'occupancyId',
            headerName: 'Occupancy ID',
            type: 'string',
        },
        {
            field: 'startTime',
            headerName: 'Start Time',
            type: 'string',
        },
        {
            field: 'endTime',
            headerName: 'End Time',
            type: 'string',
        },
        {
            field: 'maxGamma',
            headerName: 'Max Gamma (cps)',
            valueFormatter: (value) => {
                // Append units to number value, or return 'N/A'
                return typeof value === 'number' ? value : 'N/A';
            },
        },
        {
            field: 'maxNeutron',
            headerName: 'Max Neutron (cps)',
            valueFormatter: (value) => {
                // Append units to number value, or return 'N/A'
                return typeof value === 'number' ? value : 'N/A';
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            type: 'string',
        },
        {
            field: 'adjudicatedCode',
            headerName: 'Adjudicated',
            valueFormatter: (value) => {
                const adjCode = {
                    1: 'Code 1: Contraband Found',
                    2: 'Code 2: Other',
                    3: 'Code 3: Medical Isotope Found',
                    4: 'Code 4: NORM Found',
                    5: 'Code 5: Declared Shipment of Radioactive Material',
                    6: 'Code 6: Physical Inspection Negative',
                    7: 'Code 7: RIID/ASP Indicates Background Only',
                    8: 'Code 8: Other',
                    9: 'Code 9: Authorized Test, Maintenance, or Training Activity',
                    10: 'Code 10: Unauthorized Activity',
                    11: 'Code 11: Other'
                };
                return typeof value === 'number' ? adjCode[value] : 'None';
            }
        },
        {
            field: 'Menu',
            headerName: '',
            type: 'actions',
            maxWidth: 50,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<NotesRoundedIcon/>}
                    label="Details"
                    onClick={() => console.log(params.id)}
                    showInMenu
                />,
                (viewLane ?
                        <GridActionsCellItem
                            icon={<VisibilityRoundedIcon/>}
                            label="View Lane"
                            onClick={() => console.log(params.id)}
                            showInMenu
                        />
                        : <></>
                ),
            ],
        },
    ];

    // Manage list of columns in toggle menu
    const getColumnList = () => {
        const excludeFields: string[] = [];
        // Exclude fields based on component parameters
        if (!viewSecondary) excludeFields.push('secondaryInspection');
        if (!viewMenu) excludeFields.push('Menu');
        if (!viewAdjudicated) excludeFields.push('adjudicatedCode');

        return columns
            .filter((column) => !excludeFields.includes(column.field))
            .map((column) => column.field);
    }

    // Handle currently selected row
    const handleRowSelection = (selection: any[]) => {

        console.log("Selection: ", selection);

        const selectedId = selection[0]; // Get the first selected ID

        if (selectionModel[0] === selectedId) {
            // If the same row is selected, clear the selection
            setSelectionModel([]);
            if (onRowSelect) {
                onRowSelect(null); // Return an empty object when deselected
            }
        } else {
            // Otherwise, set the new selection
            setSelectionModel([selectedId]);

            // Find the selected row's eventTable
            const selectedRow = tableData.find((row) => row.id === selectedId);
            if (selectedRow && onRowSelect) {
                onRowSelect(selectedRow); // Return start and end time to parent function
            }
        }
    };

    function onRowSelect(event: EventTableData) {
        if (event) {
            dispatch(setEventPreview({
                isOpen: false,
                eventData: null,
            }));
            console.log("Row selected: ", event);
            // const currentSystem = laneMapRef.current.get(event.laneId).systems.find((system) => system.properties.id === event.systemIdx);
            const currentSystem = laneMap.get(event.laneId).systems.find((system) => system.properties.id === event.systemIdx);
            console.log("[EVT] Current System: ", currentSystem);

            dispatch(setEventPreview({
                isOpen: true,
                eventData: event,
            }));
        } else {
            console.log("Setting EventPreview Data to null");
            dispatch(setEventPreview({
                isOpen: false,
                eventData: null,
            }));
        }
    }


    /* /!** Handle return value based on tableMode *!/
     if (tableMode == "alarmtable") {
         return (
             <EventTable eventTable={tableData}/>
         )
     } else if (tableMode == "eventlog") {
         return (
             <EventTable eventTable={tableData} viewMenu viewLane viewSecondary viewAdjudicated/>
         )
     } else {
         return (<></>)
     }*/

    return (
        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={tableData}
                columns={columns}
                onRowSelectionModelChange={handleRowSelection}
                rowSelectionModel={selectionModel}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 20,
                        },
                    },
                    columns: {
                        // Manage visible columns in table based on component parameters
                        columnVisibilityModel: {
                            secondaryInspection: viewSecondary,
                            adjudicatedCode: viewAdjudicated,
                            Menu: viewMenu,
                        },
                    },
                    sorting: {
                        sortModel: [{field: 'startTime', sort: 'desc'}]
                    },
                    filter: {
                        filterModel: {
                            items: [],
                            quickFilterValues:['gamma', 'neutron'],
                            quickFilterLogicOperator: GridLogicOperator.Or
                        }
                    }
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

//     return (
//         <>
//             <Typography>Testing Alternate Table Ideas</Typography>
//         </>
//     )
// }
