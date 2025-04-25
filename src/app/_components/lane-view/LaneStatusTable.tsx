"use client"

import {useCallback, useEffect, useRef, useState} from "react";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";

import {AlarmTableData,} from "@/lib/data/oscar/TableHelpers";

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useAppDispatch} from "@/lib/state/Hooks";
import {
    addEventToLaneViewLog,
    selectLaneViewLog,
    setLaneViewLogData
} from "@/lib/state/EventDataSlice";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {Box} from "@mui/material";
import {DataGrid, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {makeStyles} from "@mui/styles";
import {selectCurrentLane} from "@/lib/state/LaneViewSlice";


const selectedRowStyles = makeStyles({
    selectedRow: {
        backgroundColor: 'rgba(33,150,243,0.5) !important',
    },
});


interface TableProps {
    laneMap: Map<string, LaneMapEntry>;
}

export default function StatusTables({laneMap}: TableProps){
    const dispatch = useAppDispatch();
    const tableData = useSelector((state: RootState) => selectLaneViewLog(state))
    const [filteredTableData, setFilteredTableData] = useState<AlarmTableData[]>([]);


    const currentLane = useSelector(selectCurrentLane)

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string, observedProperty: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});

        let obsDS: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);

        if (!obsDS) {
            return;
        }
        let obsCollection = await obsDS.searchObservations(observationFilter, 15);
        return await handleObservations(obsCollection, laneEntry, false);
    }

    async function streamObservations(laneEntry: LaneMapEntry, observedProperty: string) {
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);
        let occDS: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);
        occDS.streamObservations(new ObservationFilter({
            resultTime: `now/${futureTime.toISOString()}`
        }), (observation: any) => {
            let resultEvent = eventFromObservation(observation[0], laneEntry);
            dispatch(addEventToLaneViewLog(resultEvent));

        })
    }

    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                let result = eventFromObservation(obs, laneEntry);
                observations.push(result);
                // when fetching, this operation is a bit too costly so we probably want to just set the table with all the results we've collected
                if (addToLog) dispatch(addEventToLaneViewLog(result));
            })
        }
        return observations;
    }

    function eventFromObservation(obs: any, laneEntry: LaneMapEntry): AlarmTableData {
        let newEvent: AlarmTableData = new AlarmTableData(
            randomUUID(),
            laneEntry.laneName,
            (obs.result.gammaCount1) ? obs.result.gammaCount1 : (obs.result.neutronCount1) ? obs.result.neutronCount1 : 0,
            (obs.result.gammaCount2) ? obs.result.gammaCount2 : (obs.result.neutronCount2) ? obs.result.neutronCount2 : 0,
            (obs.result.gammaCount3) ? obs.result.gammaCount3 : (obs.result.neutronCount3) ? obs.result.neutronCount3 : 0,
            (obs.result.gammaCount4) ? obs.result.gammaCount4 : (obs.result.neutronCount4) ? obs.result.neutronCount4 : 0,
            obs.result.alarmState,
            obs.timestamp)
        return newEvent;
    }

    async function doFetch(laneMap: Map<string, LaneMapEntry>, observedProperty: string) {
        let allFetchedResults: AlarmTableData[] = [];
        let promiseGroup: Promise<void>[] = [];

        // createDatastreams(laneMap)
        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 2);
                await fetchObservations(entry, startTimeForObs.toISOString(), 'now', observedProperty)

                let fetchedResults = await fetchObservations(entry, startTimeForObs.toISOString(), 'now', observedProperty)
                allFetchedResults = [...allFetchedResults, ...fetchedResults];

            })();
            promiseGroup.push(promise);
        });

        await Promise.all(promiseGroup);
        dispatch(setLaneViewLogData(allFetchedResults))
    }

    const convertToMap = (obj: any) =>{
        if(!obj) return new Map();
        if(obj instanceof Map) return obj;
        return new Map(Object.entries(obj));
    }

    function doStream(laneMap: Map<string, LaneMapEntry>, observedProperty: string) {
        const laneMapToMap = convertToMap(laneMap);

        laneMapToMap.forEach((entry) => {
            streamObservations(entry, observedProperty);
        })
    }


    useEffect(() => {
        dataStreamSetup(laneMap);
    }, [laneMap]);

    const dataStreamSetup = useCallback(async (laneMap: Map<string, LaneMapEntry>) => {
        if(laneMap){
            await doFetch(laneMap, "http://www.opengis.net/def/alarm");
            await doFetch(laneMap, "http://www.opengis.net/def/tamper");
            doStream(laneMap, "http://www.opengis.net/def/alarm");
            doStream(laneMap, "http://www.opengis.net/def/tamper");
        }

    }, [laneMap]);



    useEffect(()=>{
        let filteredData: AlarmTableData[] = [];

        filteredData = tableData.filter((entry: AlarmTableData) => entry.laneId == currentLane)
        setFilteredTableData((prevState) => {
            return filteredData;
        })

    },[tableData])

    const locale = navigator.language || 'en-US';

    const columns: GridColDef<AlarmTableData>[] = [
        {
            field: 'laneId',
            headerName: 'Lane ID',
            type: 'string',
            minWidth: 100,
            flex: 1,
        },
        {
            field: 'timestamp',
            headerName: 'Timestamp',
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
            field: 'count1',
            headerName: 'Count 1 (CPS)',
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            minWidth: 100,
            flex: 1,
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
        },
        {
            field: 'count2',
            headerName: 'Count 2 (CPS)',
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            minWidth: 100,
            flex: 1,
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
        },
        {
            field: 'count3',
            headerName: 'Count 3 (CPS)',
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            minWidth: 100,
            flex: 1,
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
        },
        {
            field: 'count4',
            headerName: 'Count 4 (CPS)',
            type: 'number',
            align: 'left',
            headerAlign: 'left',
            minWidth: 100,
            flex: 1,
            valueFormatter: (value) => {
                return typeof value === 'number' ? value : 0;
            },
        },
        {
            field: 'status',
            headerName: 'Status',
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
    ];


    return(
        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={filteredTableData}
                columns={columns}
                initialState={{
                    pagination: {
                        paginationModel: {
                            pageSize: 15,
                        },
                    },
                    sorting: {
                        sortModel: [{field: 'timestamp', sort: 'desc'}]
                    },

                }}
                pageSizeOptions={[15]}
                slots={{toolbar: CustomToolbar}}
                autosizeOnMount
                autosizeOptions={{
                    expand: true,
                    includeOutliers: true,
                    includeHeaders: false,
                }}
                // onRowClick={(params)=>{
                //     setSelectedRow(params.row.id);
                // }}
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    // Assign className for styling to 'Status' column based on value
                    if (params.value === "Gamma Alarm") return "highlightGamma";
                    else if(params.value === "Neutron Alarm") return 'highlightNeutron'
                    else if (params.value === 'Fault - Gamma Low' || params.value === 'Fault - Gamma High' || params.value === 'Fault - Neutron Low')
                        return "highlightFault";
                    else if (params.value === "Tamper")
                        return "highlightTamper";
                    else
                        return '';


                }}
                // getRowClassName={(params) =>
                //     params.id == selectedRow ? classes.selectedRow : ''
                // }
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
                    [`.${gridClasses.cell}.highlightFault`]: {
                        backgroundColor: "warning.main",
                        color: "warning.contrastText",
                    },
                    [`.${gridClasses.cell}.highlightTamper`]: {
                        backgroundColor: "secondary.main",
                        color: "secondary.contrastText",
                    },
                    border: "none",
                }}
            />
        </Box>
    )
}





