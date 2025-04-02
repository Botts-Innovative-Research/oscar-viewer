"use client"

import {IEventTableData} from "../../../../types/new-types";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import EventTable from "./EventTable";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {EventTableData, EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {isGammaDatastream, isNeutronDatastream, isOccupancyDatastream} from "@/lib/data/oscar/Utilities";
import {makeStyles} from "@mui/styles";


interface TableProps {
    tableMode: "eventlog" | "alarmtable" | "laneview";
    laneName?: string;
}

export default function Table({tableMode, laneName}: TableProps) {

    const [data, setData] = useState<IEventTableData[]>([]); // Data to be displayed, depending on tableMode
    const [eventLog, setEventLog] = useState<IEventTableData[]>([]);

    let startTime= "2020-01-01T08:13:25.845Z";
    // Test global integrations
    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [tableData, setTableData] = useState<EventTableDataCollection>(new EventTableDataCollection());
    const occupancyTableDataRef = useRef<EventTableData[]>([]);
    const eventLogTableData = useRef<EventTableData[]>([]);


    const datasourceSetup = useCallback(async () => {

        let laneDSMap = new Map<string, LaneDSColl>();
        // check for occupancy "Driver -Occupancy"
        for (let [laneid, lane] of laneMapRef.current.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];
                let laneDSColl = laneDSMap.get(laneid);


                if (isOccupancyDatastream(ds)) {
                    laneDSColl.addDS('occRT', rtDS);

                    await fetchObservations(laneid, ds, startTime, "now");
                }
                if(isGammaDatastream(ds)){
                    laneDSColl.addDS('gammaRT', rtDS);
                }
                if(isNeutronDatastream(ds)) {
                    laneDSColl.addDS('neutronRT', rtDS);
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

                const isAlarming = obs.result.gammaAlarm || obs.result.neutronAlarm;


                const newEvent = new EventTableData(randomUUID(), laneName, obs.result);

                const laneEntry = laneMapRef.current.get(laneName);
                const systemID = laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId);

                newEvent.setSystemIdx(systemID);
                newEvent.setDataStreamId(obs["datastream@id"]);
                newEvent.setFoiId(obs["foi@id"]);

                isAlarming ? allAlarmingEvents.push(newEvent) : nonAlarmingEvents.push(newEvent);

            });
        }

        eventLogTableData.current = [...allAlarmingEvents, ...nonAlarmingEvents, ...eventLogTableData.current];
        occupancyTableDataRef.current = [...allAlarmingEvents, ...occupancyTableDataRef.current];
        setData(occupancyTableDataRef.current);
    }


    function RTMsgHandler(laneName: string, message: any, dataStreamId: string) {
        let allAlarmingEvents: EventTableData[] = [];
        let nonAlarmingEvents: EventTableData[] = [];
        if (message.values) {
            for (let value of message.values) {
                const isAlarming = value.result.gammaAlarm || value.result.neutronAlarm;

                const newEvent = new EventTableData(randomUUID(), laneName, value.data);
                const laneEntry = laneMapRef.current.get(laneName);

                const systemID = laneEntry.lookupSystemIdFromDataStreamId(value.data.datastreamId);
                newEvent.setSystemIdx(systemID);
                newEvent.setDataStreamId(dataStreamId);

                isAlarming ? allAlarmingEvents.push(newEvent) : nonAlarmingEvents.push(newEvent);

            }

            eventLogTableData.current = [...allAlarmingEvents, ...nonAlarmingEvents, ...eventLogTableData.current];
            occupancyTableDataRef.current = [...allAlarmingEvents, ...occupancyTableDataRef.current];

            setData(occupancyTableDataRef.current);
        }
    }

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;
            // should only be one for now, but this whole process needs revisiting due to codebase changes introduced after initial implemntation
            let laneEntryDS = laneMapRef.current.get(laneName).datastreams.filter((ds: typeof DataStream) => ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/pillar-occupancy-count"))[0];
            let dsId = laneEntryDS.properties?.id
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('occRT', (message: any) => {
                RTMsgHandler(msgLaneName, message, dsId)
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
            setTableData(tableData);

        } else if (tableMode === "eventlog") {
            let eventLogData = new EventTableDataCollection();
            eventLogData.setData(eventLogTableData.current);
            const sortedData = [...eventLogData.data].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            eventLogData.setData(sortedData);
            setTableData(eventLogData);
        } else if (tableMode === "laneview") {
            let eventLogData = new EventTableDataCollection();
            eventLogData.setData(eventLogTableData.current);
            const filteredData = [...eventLogData.data].filter((data) => data.laneId === laneName)

            const sortedData = [...filteredData].sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
            eventLogData.setData(sortedData);
            setTableData(eventLogData);
        }  else {
            setTableData(new EventTableDataCollection());
        }
    }, [tableMode, data, eventLog]);



    /** Handle return value based on tableMode */
    if (tableMode == "alarmtable") {
        return (
            <EventTable eventTable={tableData}/>
        )
    } else if (tableMode == "eventlog") {
        return (
            <EventTable eventTable={tableData} viewLane viewSecondary viewAdjudicated/>
        )
    } else if (tableMode == "laneview") {
        return (
            <EventTable eventTable={tableData} />
        )
    } else {
        return (<></>)
    }
}
