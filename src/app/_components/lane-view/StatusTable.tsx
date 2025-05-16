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
import {isGammaDatastream, isNeutronDatastream, isTamperDatastream} from "@/lib/data/oscar/Utilities";


// only want : Tamper and Faults
// gamma counts, neutron counts, and tamper datastreams

interface TableProps {laneMap: Map<string, LaneMapEntry>;}

export default function StatusTables({laneMap}: TableProps){
    const dispatch = useAppDispatch();
    const tableData = useSelector((state: RootState) => selectLaneViewLog(state))
    const [filteredTableData, setFilteredTableData] = useState<AlarmTableData[]>([]);

    const currentLane = useSelector(selectCurrentLane)

    async function fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string, observedProperty: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});

        let dss: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);

        if (!dss) return;

        const results: AlarmTableData[] = [];

        for (const ds of dss) {
            let obsCollection = await ds.searchObservations(observationFilter, 15);
            const result = await handleObservations(obsCollection, laneEntry, false);
            results.push(...result);
        }
        return results;

    }

    async function streamObservations(laneEntry: LaneMapEntry, observedProperty: string) {
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);

        let dss: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);

        if(!dss) return;

        dss.forEach((ds: typeof DataStream)=>{
            ds.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`
            }), (observation: any) => {
                if(observation[0]?.result?.alarmState == 'Scan' || observation[0]?.result?.alarmState === 'Background' || observation[0]?.result.alarmState === 'Alarm') return;

                let result = eventFromObservation(observation[0], laneEntry.laneName);

                if(result){

                    dispatch(addEventToLaneViewLog(result));
                }

            })
        })

    }

    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                if(obs?.result?.alarmState == 'Scan' || obs?.result?.alarmState === 'Background' || obs?.result.alarmState === 'Alarm') return;

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


    async function doFetch(laneMap: Map<string, LaneMapEntry>, observedProperty: string) {
        let allFetchedResults: AlarmTableData[] = [];
        let promiseGroup: Promise<void>[] = [];

        const laneMapToMap = convertToMap(laneMap);

        laneMapToMap.forEach((entry: LaneMapEntry, laneName: string) => {
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
        if (!laneMap) return;

        const laneMapToMap = convertToMap(laneMap);

        let hasGamma = false;
        let hasNeutron = false;
        let alarmObsProperty;
        let tamperObsProperty;
        let hasTamper = false;
        let allStatusResults: AlarmTableData[] = [];


        laneMapToMap.forEach((entry: LaneMapEntry) => {
            entry.datastreams.forEach((ds: typeof DataStream) => {
                if (!hasGamma && isGammaDatastream(ds)) {
                    hasGamma = true;
                    alarmObsProperty = ds.properties.observedProperties[0].definition;
                }
                if (!hasNeutron && isNeutronDatastream(ds)) {
                    hasNeutron = true;
                    alarmObsProperty = ds.properties.observedProperties[0].definition;
                }
                if (!hasTamper && isTamperDatastream(ds)) {
                    hasTamper = true;
                    tamperObsProperty = ds.properties.observedProperties[0].definition;

                }
            });
        });


        if (hasGamma || hasNeutron) {
            const faultResults = await doFetch(laneMap, alarmObsProperty);
            allStatusResults.push(...faultResults);
            doStream(laneMap, alarmObsProperty);
        }

        if (hasTamper) {
            const tamperResults = await doFetch(laneMap, tamperObsProperty);
            allStatusResults.push(...tamperResults);
            doStream(laneMap, tamperObsProperty);
        }

        dispatch(setLaneViewLogData(allStatusResults));
    }, [laneMap]);




    useEffect(()=>{
        let filteredData: AlarmTableData[];

        filteredData = tableData.filter((entry: AlarmTableData)=> entry?.laneId == currentLane)

        setFilteredTableData(filteredData);

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




