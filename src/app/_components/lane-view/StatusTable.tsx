"use client"

import {useCallback, useEffect, useState} from "react";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
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
import {selectCurrentLane} from "@/lib/state/LaneViewSlice";
import {
    isGammaDataStream,
    isNeutronDataStream,
    isTamperDataStream,
} from "@/lib/data/oscar/Utilities";
import { convertToMap } from "@/app/utils/Utils";
import {ALARM_DEF, TAMPER_STATUS_DEF} from "@/lib/data/Constants";


interface TableProps {laneMap: Map<string, LaneMapEntry>;}

export default function StatusTables({laneMap}: TableProps){
    const dispatch = useAppDispatch();
    const tableData = useSelector((state: RootState) => selectLaneViewLog(state))
    const [filteredTableData, setFilteredTableData] = useState<AlarmTableData[]>([]);

    const currentLane = useSelector(selectCurrentLane)
    const locale = navigator.language || 'en-US';


    const dataStreamSetup = useCallback(async (laneMap: Map<string, LaneMapEntry>) => {
        if (!laneMap) return;


        let hasGamma = false;
        let hasNeutron = false;
        let hasTamper = false;

        let allStatusResults: AlarmTableData[] = [];

        laneMap.forEach((entry: LaneMapEntry) => {
            entry.datastreams.forEach((ds: typeof DataStream) => {
                if (!hasGamma && isGammaDataStream(ds))
                    hasGamma = true;
                if (!hasNeutron && isNeutronDataStream(ds))
                    hasNeutron = true;
                if (!hasTamper && isTamperDataStream(ds))
                    hasTamper = true;
            });
        });


        if (hasGamma || hasNeutron) {
            const faultResults = await doFetch(laneMap, ALARM_DEF);
            allStatusResults.push(...faultResults);
            doStream(laneMap, ALARM_DEF);
        }

        if (hasTamper) {
            const tamperResults = await doFetch(laneMap, TAMPER_STATUS_DEF);
            allStatusResults.push(...tamperResults);
            doStream(laneMap, TAMPER_STATUS_DEF);
        }

        dispatch(setLaneViewLogData(allStatusResults));
    }, [laneMap]);


    async function doFetch(laneMap: Map<string, LaneMapEntry>, observedProperty: string) {
        let allFetchedResults: AlarmTableData[] = [];
        let promiseGroup: Promise<void>[] = [];


        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 1);

                let fetchedResults = await fetchObservations(entry, startTimeForObs.toISOString(), 'now', observedProperty) ?? [];

                allFetchedResults.push(...fetchedResults);

            })();
            promiseGroup.push(promise);
        });

        await Promise.all(promiseGroup);

        return allFetchedResults;
    }

    function doStream(laneMap: Map<string, LaneMapEntry>, observedProperty: string) {

        laneMap.forEach((entry) => {
            streamObservations(entry, observedProperty);
        });
    }

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string, observedProperty: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});

        let ds: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);
        if (!ds) return;

        const results: AlarmTableData[] = [];

        let obsCollection = await ds.searchObservations(observationFilter, 10000);
        const result = await handleObservations(obsCollection, laneEntry, false);
        results.push(...result);

        return results;

    }

    async function streamObservations(laneEntry: LaneMapEntry, observedProperty: string) {
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);

        let ds: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);
        if(!ds) return;

        ds.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (obs: any) => {
            let state = obs[0].result.alarmState;
            if(["Scan", "Background", "Alarm"].includes(state)) return;

            let result = eventFromObservation(obs[0], laneEntry.laneName);

            if(result){

                dispatch(addEventToLaneViewLog(result));
            }
        })

    }

    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                const state = obs?.result?.alarmState;
                if (["Scan", "Background", "Alarm"].includes(state)) return;

                let result = eventFromObservation(obs, laneEntry.laneName);

                if(result){
                    observations.push(result);
                    if (addToLog) dispatch(addEventToLaneViewLog(result));
                }
            })
        }
        return observations;
    }

    function eventFromObservation(obs: any, laneName: string): AlarmTableData {

        let date = (new Date(obs.timestamp)).toISOString();

        if(obs.result?.alarmState){
            let state = obs.result.alarmState;

            return new AlarmTableData(randomUUID(), laneName, state, date);

        }else if(obs.result?.tamperStatus){
            return  new AlarmTableData(randomUUID(), laneName, 'Tamper', date);
        }

    }

    useEffect(() => {
        laneMap = convertToMap(laneMap);
        dataStreamSetup(laneMap);
    }, [laneMap]);


    useEffect(()=>{
        let filteredData: AlarmTableData[] = tableData.filter((entry: AlarmTableData)=> entry?.laneId == currentLane)
        setFilteredTableData(filteredData);
    },[tableData, currentLane])


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




