"use client"

import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {IAlarmTableData, INationalTableData} from "../../../../types/new-types";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {useSelector} from "react-redux";
import  {selectNodes} from "@/lib/state/OSHSlice";
import {
    AlarmTableData,
    AlarmTableDataCollection,
    EventTableData,
    EventTableDataCollection
} from "@/lib/data/oscar/TableHelpers";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import AlarmTable from "./AlarmTable";

interface TableProps {
    laneName?: string;
}


export default function StatusTables({laneName}: TableProps){

    const [data, setData] = useState<IAlarmTableData[]>([]);

    let startTime= "2020-01-01T08:13:25.845Z";

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [tableData, setTableData] = useState<AlarmTableDataCollection>(new AlarmTableDataCollection());


    const tableRef = useRef<AlarmTableData[]>([]);


    const datasourceSetup = useCallback(async () => {

        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];
                let laneDSColl = laneDSMap.get(laneid);


                if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){

                    laneDSColl.addDS('gammaRT', rtDS);
                    await fetchObservations(laneid, ds, startTime, "now");
                }
                if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/neutron-gross-count")){
                    laneDSColl.addDS('neutronRT', rtDS);
                    await fetchObservations(laneid, ds, startTime, "now");
                }
                if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/tamper-status")){
                    laneDSColl.addDS('tamperRT', rtDS);
                    await fetchObservations(laneid, ds, startTime, "now");
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

        let statusEvents: AlarmTableData[] =[];
        let initialRes = await ds.searchObservations(new ObservationFilter({ resultTime: `${timeStart}/${timeEnd}` }), 25000);

        while (initialRes.hasNext()) {
            let obsRes = await initialRes.nextPage();
            allResults.push(...obsRes);

            obsRes.forEach((res: any) => {

                if (ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/neutron-gross-count")) {
                    if(res.result.alarmState === 'Alarm' || res.result.alarmState.includes('Fault')){

                        const date = (new Date(res.timestamp)).toISOString()
                        console.log('date', date)
                        let newEvent = new AlarmTableData(randomUUID(), laneName, res.result.alarmState, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){
                    if(res.result.alarmState === 'Alarm' || res.result.alarmState.includes('Fault')){

                        const date = (new Date(res.timestamp)).toISOString()
                        let newEvent = new AlarmTableData(randomUUID(), laneName, res.result.alarmState, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if (ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/tamper-status") && res.result.tamperStatus === true) {
                    let state = 'Tamper';
                    const date = (new Date(res.timestamp)).toISOString()
                    let newEvent = new AlarmTableData(randomUUID(), laneName, state, date)
                    newEvent ? statusEvents.push(newEvent) : null;
                }
            });
        }
        tableRef.current = [...statusEvents, ...tableRef.current];
        setData(tableRef.current);

    }

    function RTMsgHandler(laneName: string, message: any) {
        let allEvents: AlarmTableData[] = [];
        console.log('message', message)
        if (message.values) {
            for (let value of message.values) {
                console.log('value', value.data)
                let date = (new Date(value.data.timestamp)).toISOString()
                if(value.data.alarmState === 'Alarm' || value.data.alarmState.includes('Fault')){
                    let newEvent = new AlarmTableData(randomUUID(), laneName, value.data.alarmState, date);
                    newEvent ? allEvents.push(newEvent) : null;
                }
                if(value.data.tamperStatus){
                    let newEvent = new AlarmTableData(randomUUID(), laneName, 'Tamper', date);
                    newEvent ? allEvents.push(newEvent) : null;
                }
            }

            tableRef.current = [...allEvents, ...tableRef.current];

            setData(tableRef.current);
        }
    }



    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;
            // should only be one for now, but this whole process needs revisiting due to codebase changes introduced after initial implemntation
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                RTMsgHandler(msgLaneName, message)
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                RTMsgHandler(msgLaneName, message)
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                RTMsgHandler(msgLaneName, message)
            });
            laneDSColl.connectAllDS();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        addSubscriptionCallbacks();
    }, [dataSourcesByLane]);

    useEffect(() => {
        let statusData = new AlarmTableDataCollection();
        statusData.setData(tableRef.current);

        const filteredData = [...statusData.data].filter((data) => data.laneId === laneName)

        const sortedData = [...filteredData].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        statusData.setData(sortedData)
        setTableData(statusData);

    }, [data]);


    return (
        <AlarmTable alarmData={tableData}/>
    )
}


