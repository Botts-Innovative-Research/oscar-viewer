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
    isConnectionDatastream,
    isGammaDatastream,
    isNeutronDatastream,
    isOccupancyDatastream,
    isTamperDatastream, isVideoDatastream
} from "@/lib/data/oscar/Utilities";
import { convertToMap } from "@/app/utils/Utils";



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
        let alarmObsProperty;
        let tamperObsProperty;
        let occProperty;
        let hasTamper = false;


        let hasExtendedOccupancy = false;

        let allStatusResults: AlarmTableData[] = [];


        laneMap.forEach((entry: LaneMapEntry) => {
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
                if(isOccupancyDatastream((ds))){
                   hasExtendedOccupancy = true;
                   occProperty = ds.properties.observedProperties[0].definition;
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

        if(hasExtendedOccupancy){
            const extendedOccResults = await doFetch(laneMap, occProperty);
            allStatusResults.push(...extendedOccResults);
            doStream(laneMap, occProperty)
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

        let obsCollection = await ds.searchObservations(observationFilter, 15);

        const result = await handleObservations(ds, obsCollection, laneEntry, false);
        results.push(...result);

        return results;

    }


    // @ts-ignore
    async function handleObservations(ds: DataStream, obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        while(obsCollection.hasNext()){
            let obsRes = await obsCollection.nextPage();

            obsRes.map((res: any) => {
                if (isNeutronDatastream(ds) && (res.result.alarmState === 'Neutron High')) {
                    let date = (new Date(res.timestamp)).toISOString();
                    let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Neutron High', date , "2");
                    observations.push(result);
                }
                else if(isGammaDatastream(ds)){

                    if(res.result.alarmState === 'Gamma High'){
                        let date = (new Date(res.timestamp)).toISOString();
                        let result = new AlarmTableData(randomUUID(), laneEntry.laneName, "Gamma High", date, "2");
                        observations.push(result);
                    }
                    else if(res.result.alarmState.includes('Gamma Low')){
                        let date = (new Date(res.timestamp)).toISOString();
                        let result = new AlarmTableData(randomUUID(), laneEntry.laneName, "Gamma Low", date, "2");
                        observations.push(result);
                    }

                }
                else if(isTamperDatastream(ds) && res.result.tamperStatus){
                    let date = (new Date(res.timestamp)).toISOString();
                    console.log("lane entry: ", laneEntry);
                    console.log("result", res)
                    let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Tamper', date, "2");
                    observations.push(result);

                }
                else if(isOccupancyDatastream(ds)){
                    let resultTimeLength = res.result.endTime - res.result.startTime
                    // extended occupancy is defined as an occupancy lasting longer than 10 minutes
                    if(resultTimeLength > 600){

                        let date = (new Date(res.timestamp)).toISOString();
                        let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Extended Occupancy', date, "2");
                        observations.push(result);
                    }
                }
                else if(isVideoDatastream(ds)){
                    // VIDEO COMMUNICATION DISCONNECTION COUNT
                    // think they are looking for disconnections so we will need to add stuff to the backend before this changes
                    // camCount++;
                }
                else if(isConnectionDatastream(ds)){
                    // RAPISCAN COMMUNICATION DISCONNECTION COUNT
                }
            })
        }
        return observations;
    }


    async function streamObservations(laneEntry: LaneMapEntry, observedProperty: string) {
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);

        let ds: typeof DataStream = laneEntry.findDataStreamByObsProperty(observedProperty);
        if(!ds) return;

        ds.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (res: any) => {
            if (isNeutronDatastream(ds) && (res[0].result.alarmState === 'Neutron High')) {
                let date = (new Date(res[0].timestamp)).toISOString();
                let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Neutron High', date, "2");
                dispatch(addEventToLaneViewLog(result));
            }
            else if(isGammaDatastream(ds)){

                if(res[0].result.alarmState === 'Gamma High'){
                    let date = (new Date(res[0].timestamp)).toISOString();
                    let result = new AlarmTableData(randomUUID(), laneEntry.laneName, "Gamma High", date, "2");
                    dispatch(addEventToLaneViewLog(result));
                }
                else if(res[0].result.alarmState.includes('Gamma Low')){
                    let date = (new Date(res[0].timestamp)).toISOString();
                    let result = new AlarmTableData(randomUUID(), laneEntry.laneName, "Gamma Low", date, "2");
                    dispatch(addEventToLaneViewLog(result));
                }

            }else if(isTamperDatastream(ds) && res[0].result.tamperStatus){
                let date = (new Date(res[0].timestamp)).toISOString();
                console.log("lane entry: ", laneEntry);
                console.log("result", res)
                let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Tamper', date, "2");
                dispatch(addEventToLaneViewLog(result));

            }
            else if(isOccupancyDatastream(ds)){
                let resultTimeLength = res[0].result.endTime - res[0].result.startTime
                // extended occupancy is defined as an occupancy lasting longer than 10 minutes
                if(resultTimeLength > 600){

                    let date = (new Date(res[0].timestamp)).toISOString();
                    let result = new AlarmTableData(randomUUID(), laneEntry.laneName, 'Extended Occupancy', date, "2");
                    dispatch(addEventToLaneViewLog(result));
                }
            }
            else if(isVideoDatastream(ds)){
                // VIDEO COMMUNICATION DISCONNECTION COUNT
                // think they are looking for disconnections so we will need to add stuff to the backend before this changes
                // camCount++;
            }else if(isConnectionDatastream(ds)){
                // RAPISCAN COMMUNICATION DISCONNECTION COUNT
            }


            // let state = obs[0].result.alarmState;
            // if(["Scan", "Background", "Alarm"].includes(state)) return;
            //
            // let result = eventFromObservation(obs[0], laneEntry.laneName);
            //
            // if(result){
            //     dispatch(addEventToLaneViewLog(result));
            // }
        })

    }



    useEffect(() => {
        laneMap = convertToMap(laneMap);
        dataStreamSetup(laneMap);

        return () => {
          console.log("Lane View: StatusTables unmounted, cleaning up resources")
            laneMap.forEach((entry) => {

                let alarmDs: typeof DataStream = entry.findDataStreamByObsProperty("http://www.opengis.net/def/alarm")
                let tamperDs: typeof DataStream = entry.findDataStreamByObsProperty("http://www.opengis.net/def/tamper-status")

                if(alarmDs)
                    alarmDs.stream().disconnect();

                if(tamperDs)
                    tamperDs.stream().disconnect();

            });
        };
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
        <Box sx={{flex: 1, height: 800, width: '100%'}}>
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




