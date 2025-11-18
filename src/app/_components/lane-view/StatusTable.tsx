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
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";


export default function StatusTables({laneMap}: {laneMap: Map<string, LaneMapEntry>}){
    const dispatch = useAppDispatch();
    const tableData = useSelector((state: RootState) => selectLaneViewLog(state))
    const currentLane = useSelector(selectCurrentLane)
    const locale = navigator.language || 'en-US';


    async function doFetch(laneMap: Map<string, LaneMapEntry>) {
        const fetchPromises = Array.from(laneMap.values()).map(entry => fetchObservations(entry));
        const results = await Promise.all(fetchPromises);

        return results.flat();
    }

    async function fetchObservations(laneEntry: LaneMapEntry) {

        let startTime = new Date();
        startTime.setFullYear(startTime.getFullYear() - 1);

        const observationFilter = new ObservationFilter({resultTime: `${startTime.toISOString()}/now`});

        let tamperDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
        let faultDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(ALARM_DEF);

        const results: AlarmTableData[] = [];

        if (faultDs) {
            let faultDsCol = await faultDs.searchObservations(observationFilter, 1000);
            const faultRes = await handleObservations(faultDsCol, laneEntry, false);
            results.push(...faultRes);

        }

        if (tamperDs) {
            let tamperDsCol = await tamperDs.searchObservations(observationFilter, 1000);
            const tamperRes = await handleObservations(tamperDsCol, laneEntry, false);
            results.push(...tamperRes)
        }


        return results;

    }

    function doStream(laneMap: Map<string, LaneMapEntry>) {
        laneMap.forEach((entry) => {
            streamObservations(entry);
        });
    }


    async function streamObservations(laneEntry: LaneMapEntry) {
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);

        let faultDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(ALARM_DEF);
        if (faultDs) {
            faultDs.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (obs: any) => {
                let state = obs[0].result.alarmState;

                if(["Scan", "Background", "Alarm"].includes(state)) return;

                let result = eventFromObservation(obs[0], laneEntry.laneName);

                if (result){
                    dispatch(addEventToLaneViewLog(result));
                }
            })
        }

        let faultDatasource: typeof ConSysApi = laneEntry.datasourcesRealtime.find((ds: typeof ConSysApi) => {
            const parts = ds.properties.resource?.split("/");
            return parts && parts[2] === faultDs.properties.id;
        });
        if (!faultDatasource){
            console.log("Couldn't find a fault datasource");
            return;
        }
        faultDatasource.connect();

        let tamperDs: typeof DataStream = laneEntry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
        if (tamperDs) {
            tamperDs.streamObservations(new ObservationFilter({resultTime: `now/${futureTime.toISOString()}`}), (obs: any) => {
                let result = eventFromObservation(obs[0], laneEntry.laneName);

                if (result){
                    dispatch(addEventToLaneViewLog(result));
                }
            })
        }

        let tamperDatasource: typeof ConSysApi = laneEntry.datasourcesRealtime.find((ds: typeof ConSysApi) => {
            const parts = ds.properties.resource?.split("/");
            return parts && parts[2] === tamperDs.properties.id;
        });
        if (!tamperDatasource){
            console.log("Couldn't find a tamper datasource");
            return;
        }
        tamperDatasource.connect();
    }

    // @ts-ignore
    async function handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<AlarmTableData[]> {
        let observations: AlarmTableData[] = [];

        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();

            obsResults.map((obs: any) => {
                const state = obs?.result?.alarmState;
                if (["Scan", "Background", "Alarm"].includes(state))
                    return;

                let result = eventFromObservation(obs, laneEntry.laneName);

                if(result){
                    observations.push(result);
                    if (addToLog)
                        dispatch(addEventToLaneViewLog(result));
                }
            })
        }
        return observations;
    }

    function eventFromObservation(obs: any, laneName: string): AlarmTableData {
        const date = (new Date(obs.timestamp)).toISOString();

        if(obs.result?.alarmState){
            return new AlarmTableData(randomUUID(), laneName, obs.result.alarmState, date);
        }else if(obs.result?.tamperStatus){
            return new AlarmTableData(randomUUID(), laneName, 'Tamper', date);
        }
    }

    useEffect(() => {
        if (!laneMap || laneMap.size === 0 ) return;

        setup()
    }, [JSON.stringify([...laneMap.keys()])]);

    const setup = useCallback(async()=> {
        if (!laneMap) return;

        const results = await doFetch(laneMap);
        dispatch(setLaneViewLogData(results));

        doStream(laneMap);
    },[laneMap])


    const filteredTableData = useMemo(() => {
        return tableData.filter(entry => entry?.laneId === currentLane);
    }, [tableData, currentLane]);


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