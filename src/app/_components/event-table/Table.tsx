"use client";

import {IEventTableData} from "../../../../types/new-types";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import EventTable from "./EventTable";
import {IDatastream} from "@/lib/data/osh/Datastreams";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {AdjudicationData, EventTableData, EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";


interface TableProps {
    tableMode: "eventlog" | "alarmtable";
}

interface DSPair {
    datastream: IDatastream;
    datasource: typeof SweApi;
}

interface DatasourceGroup {
    laneName: string;
    gammaCountDS: DSPair;
    neutronCountDS: DSPair;
    tamperDS: DSPair;
    occupancyDS: DSPair;
}

export default function Table({tableMode}: TableProps) {

    const [data, setData] = useState<IEventTableData[]>([]); // Data to be displayed, depending on tableMode
    const [eventLog, setEventLog] = useState<IEventTableData[]>([]);
    const idVal = useRef(1);

    // const [occupancyBatchDataSources, setBatchOccupancyDataSources] = useState(null);
    // const [occupancyDataSources, setOccupancyDataSources] = useState(null);

    let server = `162.238.96.81:8781`;
    let endTime = new Date((new Date().getTime() - 1000000)).toISOString();
    let startTime = "2020-01-01T08:13:25.845Z";
    let rtEndYear = new Date().setFullYear(new Date().getFullYear() + 1);
    let rtEndTime = new Date(rtEndYear).toISOString();

    let filterByAdjudicatedCode = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    // Test global integrations
    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const tableDataRef = useRef<EventTableDataCollection>(new EventTableDataCollection());
    const batchOccupancyTableDataRef = useRef<EventTableData[]>([]);
    const occupancyTableDataRef = useRef<EventTableData[]>([]);

    const datasourceSetup = useCallback(async () => {

        let laneDSMap = new Map<string, LaneDSColl>();
        // check for occupancy "Driver -Occupancy"
        for (let [laneid, lane] of laneMapRef.current.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let batchDS = lane.datasourcesBatch[idx];
                let rtDS = lane.datasourcesRealtime[idx];
                let laneDSColl = laneDSMap.get(laneid);

                batchDS.properties.startTime = ds.properties.validTime[0];
                batchDS.properties.endTime = "now";

                rtDS.properties.startTime = "now"
                rtDS.properties.endTime = rtEndTime;
                rtDS.properties.endTime = "2025-01-01T08:13:25.845Z"

                if (ds.properties.name.includes('Driver - Occupancy')) {
                    await fetchObservations(laneid, ds, ds.properties.validTime[0], "now");
                    laneDSColl.addDS('occRT', rtDS);
                }
                if (ds.properties.name.includes('Driver - Gamma Count')) {
                    laneDSColl.addDS('gammaRT', rtDS);
                }

                if (ds.properties.name.includes('Driver - Neutron Count')) {
                    laneDSColl.addDS('neutronRT', rtDS);
                }

                if (ds.properties.name.includes('Driver - Tamper')) {
                    laneDSColl.addDS('tamperRT', rtDS);
                }
            }
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);

    async function fetchObservations(laneName: string, ds: typeof DataStream, timeStart: string, timeEnd: string) {
        let allResults: any[] = [];
        let allEvents: EventTableData[] = [];

        let initialRes = await ds.searchObservations(new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`}), 25000);
        while (initialRes.hasNext()) {
            let obsRes = await initialRes.nextPage();
            allResults.push(...obsRes);
            obsRes.map((obs: any) => {
                if (obs.result.gammaAlarm === true || obs.result.neutronAlarm === true) {
                    let newEvent = new EventTableData(idVal.current++, laneName, obs.result, new AdjudicationData('kalyn', 0));

                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId);
                    newEvent.setSystemIdx(systemID);

                    newEvent ? allEvents.push(newEvent) : null;
                }
            });
        }

        occupancyTableDataRef.current = [...allEvents, ...occupancyTableDataRef.current];
        setData(occupancyTableDataRef.current);
    }

    function BatchMsgHandler(laneName: string, message: any) {
        console.log("Batch message received:", laneName, message);
    }

    function RTMsgHandler(laneName: string, message: any) {

        if (message.values) {
            for (let value of message.values) {
                if (value.data.gammaAlarm === true || value.data.neutronAlarm === true) {
                    let newEvent = new EventTableData(idVal.current++, laneName, value.data, new AdjudicationData('kalyn', 0));

                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(value.data.datastreamId);
                    newEvent.setSystemIdx(systemID);
                    occupancyTableDataRef.current = [newEvent, ...occupancyTableDataRef.current];
                }
            }
            setData(occupancyTableDataRef.current);
        }
    }

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;
            laneDSColl.addSubscribeHandlerToAllBatchDS((message: any) => BatchMsgHandler(msgLaneName, message));
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('occRT', (message: any) => RTMsgHandler(msgLaneName, message));
            laneDSColl.connectAllDS();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        addSubscriptionCallbacks();
    }, [dataSourcesByLane]);

    useEffect(() => {
        if (tableMode === "alarmtable") {
            let tableData = new EventTableDataCollection()
            tableData.setData(occupancyTableDataRef.current);
            tableDataRef.current = tableData
        } else if (tableMode === "eventlog") {
            // tableDataRef.current = eventLog;
        } else {
            tableDataRef.current = new EventTableDataCollection();
        }
    }, [tableMode, data, eventLog]);


// }, [tableMode, data, eventLog]);

    // Toggle data to be displayed based on tableMode
    // useEffect(() => {
    //     if (tableMode == "alarmtable") {
    //         setData(
    //             ((occupancyTable.concat(batchOccupancyTable)).filter(item =>
    //                 !filterByAdjudicatedCode.includes(item.adjudicatedCode)))
    //                 .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    //         );
    //     } else if (tableMode == "eventlog") {
    //         setData(
    //             [...eventLog].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    //         );
    //     } else {
    //         setData([]);
    //     }
    // }, [tableMode, data, eventLog])

    // useEffect(() => {
    //     if (laneStatus === null && ds.length > 0) {
    //         let statuses: LaneStatusData[] = [];
    //         let laneOcc: LaneOccupancyData[] = [];
    //
    //         lanes.map((lane) => {
    //
    //             const gammaStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Gamma Count'));
    //             const neutronStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Neutron Count'));
    //             const tamperStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Tamper'));
    //             const occStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Occupancy'));
    //
    //             const occ: LaneOccupancyData = {
    //                 laneData: lane,
    //                 occupancyStreams: occStreams
    //             };
    //
    //             const stat: LaneStatusData = {
    //                 laneData: lane,
    //                 gammaDataStream: gammaStreams,
    //                 neutronDataStream: neutronStreams,
    //                 tamperDataStream: tamperStreams
    //             };
    //             statuses.push(stat);
    //             laneOcc.push(occ);
    //         });
    //         setLaneStatus(statuses);
    //         setLaneOccupancy(laneOcc);
    //     }
    // }, [ds, lanes]);

    // useEffect(() => {
    //     if (laneOccupancy && laneOccupancy.length > 0) {
    //         if (occupancyBatchDataSources === null) {
    //             const newBatchSource = laneOccupancy.map((data) => {
    //                 const batchSource = new SweApi(data.laneData.name, {
    //                     startTime: startTime,
    //                     endTime: endTime,
    //                     tls: false,
    //                     protocol: Protocols.WS,
    //                     mode: Mode.BATCH,
    //                     endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
    //                     resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
    //                     connectorOpts: {
    //                         username: 'admin',
    //                         password: 'admin',
    //                     },
    //                     prefetchBatchSize: 1000000,
    //                     prefetchBatchDuration: 5000,
    //                 });
    //                 batchSource.connect();
    //                 return batchSource;
    //
    //             });
    //             setBatchOccupancyDataSources(newBatchSource);
    //         }
    //
    //         if (occupancyDataSources === null) {
    //             const newOccSource = laneOccupancy.map((data) => {
    //                 const source = new SweApi(data.laneData.name, {
    //                     tls: false,
    //                     protocol: Protocols.WS,
    //                     mode: Mode.REAL_TIME,
    //                     endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
    //                     resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
    //                     connectorOpts: {
    //                         username: 'admin',
    //                         password: 'admin',
    //                     },
    //                 });
    //                 source.connect();
    //                 return source;
    //             });
    //             setOccupancyDataSources(newOccSource);
    //         }
    //     }
    // }, [laneOccupancy]);

    // useEffect(() => {
    //     if (occupancyBatchDataSources) {
    //         const batchSubscriptions = occupancyBatchDataSources.map((datasource: any) => {
    //             datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'batch'), [EventType.DATA]);
    //         });
    //     }
    // }, [occupancyBatchDataSources]);

    // useEffect(() => {
    //     if (occupancyDataSources) {
    //         const occupancySubscriptions = occupancyDataSources.map((datasource: any) => {
    //             datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'realTime'), [EventType.DATA]);
    //         });
    //     }
    // }, [occupancyDataSources]);

    // const handleOccupancyData = (laneName: string, message: any, mode: any) => {
    //
    //     // @ts-ignore
    //     const msgVal: any[] = message.values || [];
    //
    //     msgVal.forEach((value) => {
    //         let occupancyCount = findInObject(value, 'occupancyCount'); //number
    //         let occupancyStart = findInObject(value, 'startTime'); //string
    //         let occupancyEnd = findInObject(value, 'endTime'); //string
    //         let gammaAlarm = findInObject(value, 'gammaAlarm'); //boolean
    //         let neutronAlarm = findInObject(value, 'neutronAlarm'); //boolean
    //         let maxGamma = findInObject(value, 'maxGamma');
    //         let maxNeutron = findInObject(value, 'maxNeutron');
    //         // let adjCode = findInObject(value, 'adjudicationCode');
    //         let statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : 'No Alarm';
    //
    //         const newAlarmStatus: IEventTableData = {
    //             id: idVal.current++,
    //             secondaryInspection: false,
    //             laneId: laneName,
    //             occupancyId: occupancyCount,
    //             startTime: occupancyStart,
    //             endTime: occupancyEnd,
    //             maxGamma: maxGamma,
    //             maxNeutron: maxNeutron,
    //             status: statusType,
    //             adjudicatedUser: 'kalyn', // Update useSelector(selectCurrentUser)
    //             adjudicatedCode: 0  // Update,
    //         };
    //
    //         //set alarm table
    //         if (gammaAlarm || neutronAlarm) {
    //             if (mode === Mode.BATCH) {
    //                 setBatchOccupancyTable(prevState => [newAlarmStatus, ...prevState.filter(item =>
    //                     item.occupancyId !== occupancyCount || item.laneId !== laneName)]);
    //             } else if (mode === Mode.REAL_TIME) {
    //                 setOccupancyTable(prevState => [newAlarmStatus, ...prevState.filter(item =>
    //                     item.laneId !== laneName || item.occupancyId !== occupancyCount)]);
    //             }
    //         }
    //         //for event log post even if there is not an alarm
    //         // setEventLog(prevState => [newAlarmStatus,...prevState]); //causes repeats of same occupancy
    //         setEventLog(prevState => [newAlarmStatus, ...prevState.filter(item => item.occupancyId !== occupancyCount)]);
    //     });
    // }

    // const handleSelectedRow = (event: SelectedEvent) => {
    //     // console.log(event); // Log the selected row data
    //     onRowSelect(event); // Pass to parent component
    // };

    /** Handle return value based on tableMode */
    if (tableMode == "alarmtable") {
        return (
            <EventTable eventTable={tableDataRef.current}/>
        )
    } else if (tableMode == "eventlog") {
        return (
            // <EventTable viewMenu viewLane viewSecondary viewAdjudicated data={data}/>
            <EventTable eventTable={tableDataRef.current} viewMenu viewLane viewSecondary viewAdjudicated/>
        )
    } else {
        return (<></>)
    }
}
