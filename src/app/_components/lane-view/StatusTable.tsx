"use client"

import {AlarmTableData, EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {Box} from "@mui/material";
import {DataGrid, GridCellParams, gridClasses, GridColDef} from "@mui/x-data-grid";
import CustomToolbar from "@/app/_components/CustomToolbar";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {selectCurrentLane} from "@/lib/state/LaneViewSlice";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {
    isGammaDataStream,
    isNeutronDataStream,
    isTamperDataStream
} from "@/lib/data/oscar/Utilities";
import {selectNodes} from "@/lib/state/OSHSlice";
import { INode } from "@/lib/data/osh/Node";
import Observations from "osh-js/source/core/consysapi/observation/Observations";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {ALARM_DEF, OCCUPANCY_PILLAR_DEF, TAMPER_STATUS_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";
import {convertToMap} from "@/app/utils/Utils";


export default function StatusTables({laneMap}: {laneMap: Map<string, LaneMapEntry>}){
    const locale = navigator.language || 'en-US';

    const nodes = useSelector(selectNodes);
    const currentLane = useSelector(selectCurrentLane);

    const [loading, setLoading] = useState(false);
    const pageSize = 15
    const [paginationModel, setPaginationModel]= useState({page: 0, pageSize: pageSize});
    const [rowCount, setRowCount] = useState(0);
    const [data, setData] = useState<AlarmTableData[]>([]);

    const [totalCount, setTotalCount] = useState<Map<string, number>>(new Map());
    const [currentPage, setCurrentPage] = useState(0);
    const [pageLoadedTime] = useState(() => new Date().toISOString());

    const stableLaneMap = useMemo(() => convertToMap(laneMap), [laneMap]);

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

    async function fetchTotalCount(node: INode, datastreamIds: string[]) {
        let endpoint = node.getConnectedSystemsEndpoint(false);
        // let queryParams = `/observations/count?resultTime=../${pageLoadedTime}&format=application/om%2Bjson&dataStream=${datastreamIds.join(",")}&filter=tamperStatus=true`
        let queryParams = `/observations/count?resultTime=../${pageLoadedTime}&format=application/om%2Bjson&dataStream=${datastreamIds.join(",")}&filter=tamperStatus=true,alarmState=Fault%20-%20Neutron%20High,alarmState=Fault%20-%20Gamma%20High,alarmState=Fault%20-%20Gamma%20Low`
        let fullUrl = endpoint + queryParams;

        try {
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    ...node.getBasicAuthHeader(),
                    'Content-Type': 'sml+json'
                },
                mode: "cors"
            });

            if (!response.ok) {
                console.error("Cannot fetch total count");
                return 0;
            }
            let responseJson = await response.json();
            return responseJson.count || 0;
        } catch (error) {
            console.error("Error fetching total observation count", error);
            return 0;
        }
    }

    function eventFromObservation(obs: any, isLive: boolean): AlarmTableData {

        let newEvent: AlarmTableData;

        if (isLive) {
            if (obs?.alarmState) {
                let state = obs.alarmState;
                if (["Scan", "Background", "Alarm"].includes(state))
                    return null;
                newEvent = new AlarmTableData(randomUUID(), currentLane, state, obs.samplingTime);
            }else if (obs?.tamperStatus)
                newEvent = new AlarmTableData(randomUUID(), currentLane, "Tamper", obs.samplingtime);
        } else {
            console.log("obs", obs, isLive);

            if (obs?.properties?.result.alarmState) {
                let state = obs?.properties?.result.alarmState;
                if (["Scan", "Background", "Alarm"].includes(state))
                    return null;
                newEvent = new AlarmTableData(randomUUID(), currentLane, state, obs?.properties?.resultTime);
            }
            else if (obs?.properties?.result.tamperStatus)
                newEvent = new AlarmTableData(randomUUID(), currentLane, "Tamper", obs?.properties?.resultTime);

        }

        return newEvent;
    }

    const getDatastreamIds = useCallback((node: INode) =>  {
        const datastreamIds: string[] = [];

        const entry = stableLaneMap.get(currentLane);
        if (!entry) return datastreamIds;

        if (entry.parentNode.id !== node.id) return datastreamIds;

        const datastreams: typeof DataStream[] = entry.datastreams.filter(
            // (ds: any) => isTamperDataStream(ds)
            (ds: any) => isGammaDataStream(ds) || isNeutronDataStream(ds) || isTamperDataStream(ds)
        );

        for (const ds of datastreams) {
            datastreamIds.push(ds.properties.id);
        }

        return datastreamIds;
    }, [stableLaneMap, currentLane]);


    useEffect(() => {
        const fetchAllCounts = async () => {
            if (nodes.size === 0 || stableLaneMap.size === 0)
                return;

            const counts = new Map<string, number>();
            let total: number = 0;

            for (const node of nodes) {
                const datastreamIds = getDatastreamIds(node);

                if (datastreamIds.length === 0) continue;

                const count = await fetchTotalCount(node, datastreamIds);
                counts.set(node.id, count);

                total += count;
            }

            setTotalCount(counts);
            setRowCount(total);
        }

        fetchAllCounts();
    }, [nodes, stableLaneMap]);


    const totalObservations = useMemo(() => {
        let sum = 0;
        totalCount.forEach(count => sum += count);
        return sum;
    }, [totalCount]);

    const totalPages = Math.ceil(totalObservations / pageSize);

    const fetchPage = useCallback(async (userRequestedPage: number) => {
        setLoading(true);

        try {
            const apiPage = totalPages - 1 - userRequestedPage;
            const pageOffset = apiPage * pageSize;

            const allRows: AlarmTableData[] = [];

            for (const node of nodes) {
                const datastreamIds = getDatastreamIds(node);
                if (datastreamIds.length === 0) continue;

                const observationFilter = new ObservationFilter({
                    dataStream: datastreamIds,
                    resultTime: `../${pageLoadedTime}`,
                    // filter: "tamperStatus=true"
                    filter: "tamperStatus=true,alarmState=Fault%20-%20Neutron%20High,alarmState=Fault%20-%20Gamma%20High,alarmState=Fault%20-%20Gamma%20Low"
                });

                const obsApi: typeof Observations = await node.getObservationsApi();
                const obsCollection = await obsApi.searchObservations(observationFilter, pageSize, pageOffset);

                const results = await obsCollection.fetchData();
                for (const obs of results) {
                    const evt = eventFromObservation(obs, false);
                    allRows.push(evt);
                }

                setData(allRows);
                setCurrentPage(userRequestedPage);
            }

        } catch (error) {
            console.error("Error fetching observations,", error)
            setData([])
        } finally {
            setLoading(false);
        }
    },[nodes, stableLaneMap, totalPages])


    useEffect(() => {
        if (totalPages > 0)
            fetchPage(paginationModel.page)
    }, [paginationModel.page, paginationModel.pageSize, stableLaneMap, nodes, totalPages]);


    useEffect(() => {
        if (stableLaneMap.size === 0) {
            return;
        }

        const connectedSources: typeof ConSysApi[] = [];

        for (const entry of stableLaneMap.values()) {
            const alarmStream: typeof DataStream = entry.findDataStreamByObsProperty(ALARM_DEF);
            const tamperStream: typeof DataStream = entry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);

            if (!alarmStream) {
                continue;
            }
            if (!tamperStream) {
                continue;
            }

            const alarmSource = entry.datasourcesRealtime?.find((ds: any) => {
                const parts = ds.properties.resource?.split("/");
                return parts && parts[2] === alarmStream.properties.id;
            });

            if (!alarmSource) {
                continue;
            }

            const tamperSource = entry.datasourcesRealtime?.find((ds: any) => {
                const parts = ds.properties.resource?.split("/");
                return parts && parts[2] === tamperStream.properties.id;
            });

            if (!tamperSource) {
                continue;
            }


            const handleMessage = (msg: any) => {
                try {
                    const obsData = msg.values?.[0]?.data || msg;
                    const event = eventFromObservation(obsData, true);

                    if (currentPage === 0) {
                        setData(prev => {
                            return [event, ...prev].slice(0, pageSize);
                        });
                        setRowCount(prev => prev + 1);
                    }
                } catch (err) {
                    console.error("Error creating event from observation:", err);
                }
            };

            alarmSource.subscribe(handleMessage, [EventType.DATA]);
            tamperSource.subscribe(handleMessage, [EventType.DATA]);

            try {
                alarmSource.connect()
                tamperSource.connect();
                connectedSources.push(alarmSource);
                connectedSources.push(tamperSource);
            } catch (err) {
                console.error("Error connecting occSource:", err);
            }
        }
    }, [stableLaneMap]);


    return(
        <Box sx={{height: 800, width: '100%'}}>
            <DataGrid
                rows={data}
                paginationMode="server"
                loading={loading}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                rowCount={rowCount}
                columns={columns}
                pageSizeOptions={[15]}
                slots={{ toolbar: CustomToolbar }}
                initialState={{
                    sorting: {
                        sortModel: [{field: 'timestamp', sort: 'desc'}]
                    }
                }}
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