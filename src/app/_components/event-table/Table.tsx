"use client";

import {IEventTableData} from "../../../../types/new-types";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import EventTable from "./EventTable";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {AdjudicationData, EventTableData, EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";


interface TableProps {
    tableMode: "eventlog" | "alarmtable";
}

export default function Table({tableMode}: TableProps) {

    const [data, setData] = useState<IEventTableData[]>([]); // Data to be displayed, depending on tableMode
    const [eventLog, setEventLog] = useState<IEventTableData[]>([]);
    const idVal = useRef(1);

    let rtEndYear = new Date().setFullYear(new Date().getFullYear() + 1);
    let rtEndTime = new Date(rtEndYear).toISOString();

    // Test global integrations
    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const tableDataRef = useRef<EventTableDataCollection>(new EventTableDataCollection());
    const batchOccupancyTableDataRef = useRef<EventTableData[]>([]);
    const occupancyTableDataRef = useRef<EventTableData[]>([]);

    const eventLogTableData = useRef<EventTableData[]>([]);

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

                // rtDS.properties.startTime = "now"
                // // rtDS.properties.endTime = rtEndTime;
                // rtDS.properties.endTime = "2055-01-01T08:13:25.845Z"

                if (ds.properties.name.includes('Driver - Occupancy')) {
                    laneDSColl.addDS('occRT', rtDS);
                    await fetchObservations(laneid, ds, ds.properties.validTime[0], "now");


                    // laneDSColl.addDS('occBatch', batchDS);
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
        let allAlarmingEvents: EventTableData[] = [];
        let nonAlarmingEvents: EventTableData[] = [];

        let initialRes = await ds.searchObservations(new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`}), 25000);
        while (initialRes.hasNext()) {
            let obsRes = await initialRes.nextPage();
            allResults.push(...obsRes);
            obsRes.map((obs: any) => {
                // console.log("Observation Result: ", obs);
                if (obs.result.gammaAlarm === true || obs.result.neutronAlarm === true) {

                    let newEvent = new EventTableData(idVal.current++, laneName, obs.result, new AdjudicationData('N/A', 0));

                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId);
                    newEvent.setSystemIdx(systemID);

                    newEvent ? allAlarmingEvents.push(newEvent) : null;
                }
                else if(obs.result.gammaAlarm === false || obs.result.neutronAlarm === false){ //for event log :p

                    let newEvent = new EventTableData(idVal.current++, laneName, obs.result, new AdjudicationData('N/A', 0));

                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId);
                    newEvent.setSystemIdx(systemID);

                    newEvent ? nonAlarmingEvents.push(newEvent) : null;
                }

            });
        }
        const existingOcc = new Set(occupancyTableDataRef.current.map(event => event.occupancyId));
        const filterOccList = allAlarmingEvents.filter((event) => !existingOcc.has(event.occupancyId));

        const eventLogTableOccupancy = new Set(eventLogTableData.current.map(event => event.occupancyId));
        const filterNonAlarmingOccList = nonAlarmingEvents.filter((event) => !eventLogTableOccupancy.has(event.occupancyId));

        eventLogTableData.current = [...filterNonAlarmingOccList, ...filterOccList, ...eventLogTableData.current];
        occupancyTableDataRef.current = [...filterOccList, ...occupancyTableDataRef.current];
        setData(occupancyTableDataRef.current);
    }

    function BatchMsgHandler(laneName: string, message: any) {
        console.log("Batch message received:", laneName, message);
    }

    function RTMsgHandler(laneName: string, message: any) {
        let allAlarmingEvents: EventTableData[] = [];
        let nonAlarmingEvents: EventTableData[] = [];
        if (message.values) {
            for (let value of message.values) {

                if (value.data.gammaAlarm === true || value.data.neutronAlarm === true) {
                    let newEvent = new EventTableData(idVal.current++, laneName, value.data, new AdjudicationData('N/A', 0));
                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(value.data.datastreamId);
                    newEvent.setSystemIdx(systemID);
                    console.log('alarming rt msg', newEvent);

                    newEvent ? allAlarmingEvents.push(newEvent) : null;


                }
                else if (value.data.gammaAlarm === false || value.data.neutronAlarm === false) {

                    let newEvent = new EventTableData(idVal.current++, laneName, value.data, new AdjudicationData('N/A', 0));

                    let laneEntry = laneMapRef.current.get(laneName);
                    const systemID = laneEntry.lookupSystemIdFromDataStreamId(value.data.datastreamId);
                    newEvent.setSystemIdx(systemID);
                    console.log('non alarming rt msg', newEvent);
                    newEvent ? nonAlarmingEvents.push(newEvent) : null;
                }
            }
            const existingOcc = new Set(occupancyTableDataRef.current.map(event => event.occupancyId));
            const filterOccList = allAlarmingEvents.filter((event) => !existingOcc.has(event.occupancyId));

            const eventLogTableOccupancy = new Set(eventLogTableData.current.map(event => event.occupancyId));
            const filterNonAlarmingOccList = nonAlarmingEvents.filter((event) => !eventLogTableOccupancy.has(event.occupancyId));

            eventLogTableData.current = [...filterNonAlarmingOccList, ...filterOccList, ...eventLogTableData.current];
            occupancyTableDataRef.current = [...filterOccList, ...occupancyTableDataRef.current];

            setData(occupancyTableDataRef.current);
        }
    }

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;
            // laneDSColl.addSubscribeHandlerToALLDSMatchingName('occBatch', (message: any) => BatchMsgHandler(msgLaneName, message));
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('occRT', (message: any) => {
                RTMsgHandler(msgLaneName, message)
            });
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
            const sortedData = [...tableData.data].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            tableData.setData(sortedData);
            tableDataRef.current = tableData

        } else if (tableMode === "eventlog") {
            let eventLogData = new EventTableDataCollection();
            eventLogData.setData(eventLogTableData.current);
            const sortedData = [...eventLogData.data].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            eventLogData.setData(sortedData);
            tableDataRef.current = eventLogData;
        } else {
            tableDataRef.current = new EventTableDataCollection();
        }
    }, [tableMode, data, eventLog]);


    /** Handle return value based on tableMode */
    if (tableMode == "alarmtable") {
        return (
            <EventTable eventTable={tableDataRef.current}/>
        )
    } else if (tableMode == "eventlog") {
        return (
            <EventTable eventTable={tableDataRef.current} viewMenu viewLane viewSecondary viewAdjudicated/>
        )
    } else {
        return (<></>)
    }
}