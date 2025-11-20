"use client"

import {AlarmTableData,} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {Box} from "@mui/material";
import {DataGrid, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useAppDispatch} from "@/lib/state/Hooks";
import {addEventToLaneViewLog, selectLaneViewLog, setLaneViewLogData} from "@/lib/state/EventDataSlice";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectCurrentLane} from "@/lib/state/LaneViewSlice";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {ALARM_DEF, TAMPER_STATUS_DEF} from "@/lib/data/Constants";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {selectNodes} from "@/lib/state/OSHSlice";
import {INode} from "@/lib/data/osh/Node";
import Observations from "osh-js/source/core/consysapi/observation/Observations";


//PAGINATED need to figure out the predicate filter for getting rid of the background/scan/alarm statuses and only showing results for the faults/tampers
export default function StatusTables({laneMap}: {laneMap: Map<string, LaneMapEntry>}){
    const locale = navigator.language || 'en-US';

    const [loading, setLoading] = useState(false);
    const pageSize = 15
    const [paginationModel, setPaginationModel]= useState({page: 0, pageSize: pageSize});
    const [rowCount, setRowCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [previousPage, setPreviousPage] = useState(0);
    const obsCollectionRef = useRef(null);

    const dispatch = useAppDispatch();
    const [data, setData] = useState<AlarmTableData[]>([]);
    const tableData = useSelector((state: RootState) => selectLaneViewLog(state));
    const currentLane = useSelector(selectCurrentLane);

    const nodes = useSelector(selectNodes);

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
            field: 'status',
            headerName: 'Status',
            type: 'string',
            minWidth: 150,
            flex: 1,
        },
    ];


    useEffect(() => {
        fetchPage(laneMap, paginationModel.page, paginationModel.pageSize);
    }, [laneMap, paginationModel.page, paginationModel.pageSize]);

    async function fetchPage(laneMap: Map<string, LaneMapEntry>, currentPage: number, pageSize: number) {
        let pageResults: AlarmTableData[] = [];

        let promiseGroup: Promise<void>[] = [];

        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {

                const alarmDataStream: typeof DataStream = entry.findDataStreamByObsProperty(ALARM_DEF);
                const tamperDataStream: typeof DataStream = entry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);

                let results = await fetchObservations(alarmDataStream, tamperDataStream, currentPage, pageSize);
                pageResults.push(...results);

            })();
            promiseGroup.push(promise);
        });

        await Promise.all(promiseGroup);

        dispatch(setLaneViewLogData(pageResults));

        setData(pageResults);

        // fetch total amount of observations
        setRowCount(getTotalObservationCount())
    }

    function getTotalObservationCount() {
        //http://localhost:8282/sensorhub/api/observations/count?dataStream=0k0g,0k20
        return 5212;
    }

    async function fetchObservations(alarmDataStream: typeof DataStream, tamperDataStream: typeof DataStream, page: number, pageSize: number) {
        const resultsFetched: AlarmTableData[] = [];

        // const startTime = new Date().setFullYear(new Date().getFullYear() - 1);

        const observationFilter = new ObservationFilter({
            // observedProperty: [ALARM_DEF, TAMPER_STATUS_DEF],
            dataStream: [alarmDataStream.properties.id, tamperDataStream.properties.id],
            // resultTime: "latest"
        });


        for (const node of nodes) {
            let observationApi: typeof Observations = await node.getObservationsApi();

            let observationCollection = await observationApi.searchObservations(observationFilter, pageSize);

            console.log("obscol", observationCollection);
            const results = await handleObservations(observationCollection, page)
            resultsFetched.push(...results);
        }

        // let alarmDataStream: typeof DataStream = laneEntry.findDataStreamByObsProperty(ALARM_DEF);
        // let tamperDataStream: typeof DataStream = laneEntry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
        //
        // let obsCollection = await alarmDataStream.searchObservations(undefined, pageSize);

        return resultsFetched;
    }

    const [obsCurrentPage, setObsCurrentPage] = useState(0);

    async function handleObservations(obsCollection: any, page: number): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        // while (obsCollection.hasNext()) {
        //     let obsResults = await obsCollection.nextPage();
        //     obsResults.map((obs: any) => {
        //         const state = obs?.result?.alarmState;
        //         console.log("HELLO OBS: ", obs);
        //
        //         if (["Scan", "Background", "Alarm"].includes(state)) return;
        //
        //         let result = eventFromObservation(obs);
        //
        //         if(result){
        //             observations.push(result);
        //             dispatch(addEventToLaneViewLog(result));
        //         }
        //     })
        // }
        let results = await obsCollection.page(paginationModel.page + 1);

        setObsCurrentPage(obsCollection.currentPage);

        console.log("Results from fetch: ", results);
        console.log(`Pagination page ${paginationModel.page} vs obs collection page ${obsCollection.currentPage}`);
        if(paginationModel.page >= previousPage && obsCollection.hasNext()){
            results = await obsCollection.nextPage();
            setObsCurrentPage(obsCollection.currentPage);
        }else if(paginationModel.page < previousPage && obsCollection.hasPrevious()){
            results = await obsCollection.previousPage();
            setObsCurrentPage(obsCollection.currentPage);
        }

        results.map((obs: any) => {
            const state = obs.properties?.result?.alarmState;

            // if (["Scan", "Background", "Alarm"].includes(state)) return;

            let result = eventFromObservation(obs);

            if(result){
                observations.push(result);
                dispatch(addEventToLaneViewLog(result));
            }
        })
        return observations;
    }

    function eventFromObservation(obs: any): AlarmTableData {
        // let date = (new Date(obs.timestamp)).toISOString();

        if(obs?.properties?.result?.alarmState){
            let state = obs.properties.result.alarmState;

            return new AlarmTableData(randomUUID(), currentLane, state, obs.properties.resultTime);

        }else if(obs.properties.result?.tamperStatus){
            console.log("event frm obs", obs);

            return new AlarmTableData(randomUUID(), currentLane, 'Tamper', new Date().toISOString());
        }
    }


    console.log("table data", data)

    return(
        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={data}
                columns={columns}
                pagination
                paginationMode="server"
                loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowCount={rowCount}
                pageSizeOptions={[15, 30, 50]}
                slots={{ toolbar: CustomToolbar }}
                autosizeOnMount
                getCellClassName={(params: GridCellParams<any, any, string>) => {
                    // Assign className for styling to 'Status' column based on value
                    if (params.value.includes("Gamma")) return "highlightGamma";
                    if (params.value.includes('Neutron')) return "highlightNeutron";
                    else if (params.value === "Tamper") return "highlightTamper";
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


// export default function StatusTables({laneMap}: {laneMap: Map<string, LaneMapEntry>}){
//     const dispatch = useAppDispatch();
//     const tableData = useSelector((state: RootState) => selectLaneViewLog(state))
//     const currentLane = useSelector(selectCurrentLane)
//     const locale = navigator.language || 'en-US';
//
//
//     async function doFetch(laneMap: Map<string, LaneMapEntry>) {
//         const fetchPromises = Array.from(laneMap.values()).map(entry => fetchObservations(entry));
//         const results = await Promise.all(fetchPromises);
//
//         return results.flat();
//     }
//
//     async function fetchObservations(laneEntry: LaneMapEntry) {
//
//         let startTime = new Date();
//         startTime.setFullYear(startTime.getFullYear() - 1);
//
//         const observationFilter = new ObservationFilter({resultTime: `${startTime.toISOString()}/now`});
//
//         let tamperDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
//         let faultDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(ALARM_DEF);
//
//         const results: AlarmTableData[] = [];
//
//         if (faultDs) {
//             let faultDsCol = await faultDs.searchObservations(observationFilter, 10000);
//             const faultRes = await handleObservations(faultDsCol, laneEntry, false);
//             results.push(...faultRes);
//
//         }
//
//         if (tamperDs) {
//             let tamperDsCol = await tamperDs.searchObservations(observationFilter, 10000);
//             const tamperRes = await handleObservations(tamperDsCol, laneEntry, false);
//             results.push(...tamperRes)
//         }
//
//
//         return results;
//
//     }
//
//     function doStream(laneMap: Map<string, LaneMapEntry>) {
//         laneMap.forEach((entry) => {
//             streamObservations(entry);
//         });
//     }
//
//     async function streamObservations(laneEntry: LaneMapEntry) {
//         let futureTime = new Date();
//         futureTime.setFullYear(futureTime.getFullYear() + 1);
//
//         let faultDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(ALARM_DEF);
//         if (faultDs) {
//             faultDs.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (obs: any) => {
//                 let state = obs[0].result.alarmState;
//
//                 if(["Scan", "Background", "Alarm"].includes(state)) return;
//
//                 let result = eventFromObservation(obs[0], laneEntry.laneName);
//
//                 if (result){
//                     dispatch(addEventToLaneViewLog(result));
//                 }
//             })
//         }
//
//         let tamperDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
//         if (tamperDs) {
//             tamperDs.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (obs: any) => {
//                 let result = eventFromObservation(obs[0], laneEntry.laneName);
//
//                 if (result){
//                     dispatch(addEventToLaneViewLog(result));
//                 }
//             })
//         }
//
//     }
//
//     // @ts-ignore
//     async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
//         let observations: AlarmTableData[] = [];
//
//         while (obsCollection.hasNext()) {
//             let obsResults = await obsCollection.nextPage();
//
//             obsResults.map((obs: any) => {
//                 const state = obs?.result?.alarmState;
//                 if (["Scan", "Background", "Alarm"].includes(state))
//                     return;
//
//                 let result = eventFromObservation(obs, laneEntry.laneName);
//
//                 if(result){
//                     observations.push(result);
//                     if (addToLog)
//                         dispatch(addEventToLaneViewLog(result));
//                 }
//             })
//         }
//         return observations;
//     }
//
//     function eventFromObservation(obs: any, laneName: string): AlarmTableData {
//         const date = (new Date(obs.timestamp)).toISOString();
//
//         if(obs.result?.alarmState){
//             return new AlarmTableData(randomUUID(), laneName, obs.result.alarmState, date);
//         }else if(obs.result?.tamperStatus){
//             return new AlarmTableData(randomUUID(), laneName, 'Tamper', date);
//         }
//     }
//
//     useEffect(() => {
//         setup()
//     }, [laneMap]);
//
//     const setup = useCallback(async()=> {
//         if (!laneMap) return;
//
//         const results = await doFetch(laneMap);
//         dispatch(setLaneViewLogData(results));
//
//         doStream(laneMap);
//     },[laneMap])
//
//
//     const filteredTableData = useMemo(() => {
//         return tableData.filter(entry => entry?.laneId === currentLane);
//     }, [tableData, currentLane]);
//
//
//     const columns: GridColDef<AlarmTableData>[] = [
//         {
//             field: 'laneId',
//             headerName: 'Lane ID',
//             type: 'string',
//             minWidth: 100,
//             flex: 1,
//         },
//         {
//             field: 'timestamp',
//             headerName: 'Timestamp',
//             valueFormatter: (params) => (new Date(params)).toLocaleString(locale, {
//                 year: 'numeric',
//                 month: 'numeric',
//                 day: 'numeric',
//                 hour: 'numeric',
//                 minute: 'numeric',
//                 second: 'numeric'
//             }),
//             minWidth: 200,
//             flex: 2,
//         },
//         {
//             field: 'status',
//             headerName: 'Status',
//             type: 'string',
//             minWidth: 150,
//             flex: 1,
//         },
//     ];
//
//     return(
//         <Box sx={{height: 800, width: '100%'}}>
//             <DataGrid
//                 rows={filteredTableData}
//                 columns={columns}
//                 initialState={{
//                     pagination: {
//                         paginationModel: {
//                             pageSize: 15,
//                         },
//                     },
//                     sorting: {
//                         sortModel: [{field: 'timestamp', sort: 'desc'}]
//                     },
//
//                 }}
//                 pageSizeOptions={[15]}
//                 slots={{toolbar: CustomToolbar}}
//                 autosizeOnMount
//                 autosizeOptions={{
//                     expand: true,
//                     includeOutliers: true,
//                     includeHeaders: false,
//                 }}
//
//                 getCellClassName={(params: GridCellParams<any, any, string>) => {
//                     // Assign className for styling to 'Status' column based on value
//                     if (params.value.includes("Gamma")) return "highlightGamma";
//                     if (params.value.includes('Neutron')) return "highlightNeutron";
//                     else if (params.value === "Tamper") return "highlightTamper";
//                     else
//                         return '';
//                 }}
//
//                 sx={{
//                     // Assign styling to 'Status' column based on className
//                     [`.${gridClasses.cell}.highlightGamma`]: {
//                         backgroundColor: "error.main",
//                         color: "error.contrastText",
//                     },
//                     [`.${gridClasses.cell}.highlightNeutron`]: {
//                         backgroundColor: "info.main",
//                         color: "info.contrastText",
//                     },
//                     [`.${gridClasses.cell}.highlightTamper`]: {
//                         backgroundColor: "secondary.main",
//                         color: "secondary.contrastText",
//                     },
//                     border: "none",
//                 }}
//             />
//         </Box>
//     )
// }