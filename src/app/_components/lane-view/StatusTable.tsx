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
import {ALARM_DEF, TAMPER_STATUS_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";
import {convertToMap} from "@/app/utils/Utils";

interface StatusTableProps {
    currentLane: string,
    entry: LaneMapEntry
}

export default function StatusTable({currentLane, entry}: StatusTableProps){
    const locale = navigator.language || 'en-US';

    const nodes = useSelector(selectNodes);

    const [loading, setLoading] = useState(false);
    const pageSize = 15
    const [paginationModel, setPaginationModel]= useState({page: 0, pageSize: pageSize});
    const [rowCount, setRowCount] = useState(0);
    const [data, setData] = useState<AlarmTableData[]>([]);

    const [currentPage, setCurrentPage] = useState(0);
    const [pageLoadedTime] = useState(() => new Date().toISOString());


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
        const queryParams = new URLSearchParams({
            // resultTime: `../${pageLoadedTime}`, I think it is safe to fetch count of all here
            format: "application/om+json",
            dataStream: `${datastreamIds.join(",")}`,
            filter: `tamperStatus=true OR alarmState='Fault - Neutron High' OR alarmState='Fault - Gamma High' OR alarmState='Fault - Gamma Low'`
        });
            // `?resultTime=../${pageLoadedTime}&format=application/om%2Bjson&dataStream=${datastreamIds.join(",")}&filter=tamperStatus=true OR alarmState=Fault%20-%20Neutron%20High OR alarmState=Fault%20-%20Gamma%20High OR alarmState=Fault%20-%20Gamma%20Low`
        let fullUrl = endpoint + "/observations/count?" + queryParams;

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

    function eventFromObservation(obs: any, isLive: boolean): AlarmTableData | undefined {
        if (!obs) return undefined;

        let newEvent: AlarmTableData | undefined;

        if (isLive) {
            if (obs?.alarmState) {
                const state = obs.alarmState;
                if (!["Scan", "Background", "Alarm"].includes(state)) {
                    newEvent = new AlarmTableData(randomUUID(), currentLane, state, obs.samplingTime);
                }
            } else if (obs?.tamperStatus) {
                newEvent = new AlarmTableData(randomUUID(), currentLane, "Tamper", obs.samplingtime);
            }
        } else {
            const result = obs?.properties?.result;
            if (result?.alarmState && !["Scan", "Background", "Alarm"].includes(result.alarmState)) {
                newEvent = new AlarmTableData(randomUUID(), currentLane, result.alarmState, obs.properties.resultTime);
            } else if (result?.tamperStatus) {
                newEvent = new AlarmTableData(randomUUID(), currentLane, "Tamper", obs.properties.resultTime);
            }
        }

        return newEvent;
    }


    const getDatastreamIds = useCallback((node: INode) =>  {
        const datastreamIds: string[] = [];

        if (!entry) return datastreamIds;

        if (entry.parentNode.id !== node.id)
            return datastreamIds;

        const datastreams: typeof DataStream[] = entry.datastreams.filter(
            (ds: any) => isGammaDataStream(ds) || isNeutronDataStream(ds) || isTamperDataStream(ds)
        );

        for (const ds of datastreams) {
            datastreamIds.push(ds.properties.id);
        }

        return datastreamIds;
    }, [currentLane, entry]);


    useEffect(() => {
        const fetchAllCounts = async () => {

            let total: number = 0;

            const selectedNode = nodes.find((node: INode) => entry.parentNode.id === node.id);

            const datastreamIds = getDatastreamIds(selectedNode);

            const count = await fetchTotalCount(selectedNode, datastreamIds);

            total += count;

            setRowCount(total);
        }

        fetchAllCounts();
    }, [nodes, entry]);



    const totalPages = Math.ceil(rowCount / pageSize);

    const fetchPage = useCallback(async (userRequestedPage: number) => {
        setLoading(true);

        try {
            const apiPage = totalPages - 1 - userRequestedPage;
            const pageOffset = apiPage * pageSize;

            const allRows: AlarmTableData[] = [];

            const node = nodes.find((node: INode) => entry.parentNode.id === node.id);

            if (!node) return;

            const datastreamIds = getDatastreamIds(node);
            if (datastreamIds.length === 0) return;

            const observationFilter = new ObservationFilter({
                dataStream: datastreamIds,
                resultTime: `../${pageLoadedTime}`,
                filter: "tamperStatus=true"
                // filter: "tamperStatus=true,alarmState=Fault%20-%20Neutron%20High,alarmState=Fault%20-%20Gamma%20High,alarmState=Fault%20-%20Gamma%20Low"
            });

            const obsApi: typeof Observations = await node.getObservationsApi();
            const obsCollection = await obsApi.searchObservations(observationFilter, pageSize, pageOffset);

            const results = await obsCollection.fetchData();
            for (const obs of results) {
                const evt = eventFromObservation(obs, false);
                if (evt !== undefined)
                    allRows.push(evt);
            }

            setData(allRows.filter((evt): evt is AlarmTableData => evt !== null && evt !== undefined));
            setCurrentPage(userRequestedPage);

        } catch (error) {
            console.error("Error fetching observations,", error)
            setData([])
        } finally {
            setLoading(false);
        }
    },[nodes, totalPages])


    useEffect(() => {
        if (totalPages > 0)
            fetchPage(paginationModel.page)
    }, [paginationModel.page, paginationModel.pageSize, nodes, totalPages]);


    // useEffect(() => {
    //     const connectedSources: typeof ConSysApi[] = [];
    //
    //     const handleMessage = (msg: any) => {
    //         try {
    //             const obsData = msg.values?.[0]?.data || msg;
    //             const event = eventFromObservation(obsData, true);
    //
    //             if (currentPage === 0) {
    //                 setData(prev => {
    //                     return [event, ...prev].slice(0, pageSize);
    //                 });
    //                 setRowCount(prev => prev + 1);
    //             }
    //         } catch (err) {
    //             console.error("Error creating event from observation:", err);
    //         }
    //     };
    //
    //     const alarmStream: typeof DataStream = entry.findDataStreamByObsProperty(ALARM_DEF);
    //
    //     if (!alarmStream) {
    //         console.info("No alarm datastream");
    //     }
    //
    //
    //     const alarmSource = entry.datasourcesRealtime?.find((ds: any) => {
    //         const parts = ds.properties.resource?.split("/");
    //         return parts && parts[2] === alarmStream.properties.id;
    //     });
    //
    //     if (!alarmSource) {
    //         console.info("No alarm datasource");
    //     }
    //
    //     alarmSource.subscribe(handleMessage, [EventType.DATA]);
    //     try {
    //         alarmSource.connect()
    //         connectedSources.push(alarmSource);
    //     } catch (err) {
    //         console.error("Error connecting alarm source:", err);
    //     }
    // }, [entry]);
    //
    // useEffect(() => {
    //
    //     const connectedSources: typeof ConSysApi[] = [];
    //
    //     const handleMessage = (msg: any) => {
    //         try {
    //             const obsData = msg.values?.[0]?.data || msg;
    //             const event = eventFromObservation(obsData, true);
    //
    //             if (currentPage === 0) {
    //                 setData(prev => {
    //                     return [event, ...prev].slice(0, pageSize);
    //                 });
    //                 setRowCount(prev => prev + 1);
    //             }
    //         } catch (err) {
    //             console.error("Error creating event from observation:", err);
    //         }
    //     };
    //
    //
    //     const tamperStream: typeof DataStream = entry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);
    //
    //     if (!tamperStream) {
    //         console.info("no tamper datastream");
    //     }
    //     const tamperSource = entry.datasourcesRealtime?.find((ds: any) => {
    //         const parts = ds.properties.resource?.split("/");
    //         return parts && parts[2] === tamperStream.properties.id;
    //     });
    //
    //     if (!tamperSource) {
    //         console.info("no tamper datasource");
    //     }
    //
    //     tamperSource.subscribe(handleMessage, [EventType.DATA]);
    //
    //     try {
    //         tamperSource.connect();
    //         connectedSources.push(tamperSource);
    //     } catch (err) {
    //         console.error("Error connecting tamper source:", err);
    //     }
    //
    // }, [entry]);


    useEffect(() => {
        if (!entry) {
            console.warn("No entry provided for realtime data");
            return;
        }

        const connectedSources: typeof ConSysApi[] = [];

        const handleMessage = (msg: any) => {
            try {
                const obsData = msg.values?.[0]?.data || msg;
                const event = eventFromObservation(obsData, true);

                // CRITICAL FIX: Check if event is defined before adding to array
                if (event && currentPage === 0) {
                    setData(prev => {
                        return [event, ...prev].slice(0, pageSize);
                    });
                    setRowCount(prev => prev + 1);
                }
            } catch (err) {
                console.error("Error creating event from observation:", err);
            }
        };

        const alarmStream: typeof DataStream = entry.findDataStreamByObsProperty(ALARM_DEF);

        if (!alarmStream) {
            console.info("No alarm datastream");
        } else {
            const alarmSource = entry.datasourcesRealtime?.find((ds: any) => {
                const parts = ds.properties.resource?.split("/");
                return parts && parts[2] === alarmStream.properties.id;
            });

            if (!alarmSource) {
                console.info("No alarm datasource");
            } else {
                try {
                    alarmSource.subscribe(handleMessage, [EventType.DATA]);
                    alarmSource.connect()
                    connectedSources.push(alarmSource);
                } catch (err) {
                    console.error("Error connecting alarm source:", err);
                }
            }
        }

        const tamperStream: typeof DataStream = entry.findDataStreamByObsProperty(TAMPER_STATUS_DEF);

        if (!tamperStream) {
            console.info("no tamper datastream");
        } else {
            const tamperSource = entry.datasourcesRealtime?.find((ds: any) => {
                const parts = ds.properties.resource?.split("/");
                return parts && parts[2] === tamperStream.properties.id;
            });

            if (!tamperSource) {
                console.info("no tamper datasource");
            } else {
                try {
                    tamperSource.subscribe(handleMessage, [EventType.DATA]);
                    tamperSource.connect();
                    connectedSources.push(tamperSource);
                } catch (err) {
                    console.error("Error connecting tamper source:", err);
                }
            }
        }

    }, [entry, currentPage, pageSize]);
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