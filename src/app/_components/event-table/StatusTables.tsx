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
                    let state = res.result.alarmState;
                    let count1 = res.result.neutronCount1;
                    let count2 = res.result.neutronCount2;
                    let count3 = res.result.neutronCount3;
                    let count4 = res.result.neutronCount4;

                    if(state === 'Alarm'){
                        state = 'Neutron Alarm'
                    }
                    if(state.includes('Alarm') || state.includes('Fault')){
                        const date = (new Date(res.timestamp)).toISOString();
                        let newEvent = new AlarmTableData(randomUUID(), laneName, count1, count2, count3, count4, state, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){
                    let state = res.result.alarmState;
                    let count1 = res.result.gammaCount1;
                    let count2 = res.result.gammaCount2;
                    let count3 = res.result.gammaCount3;
                    let count4 = res.result.gammaCount4;

                    if(state === 'Alarm'){
                        state = 'Gamma Alarm'
                    }

                    if(state.includes('Alarm') || state.includes('Fault')){
                        const date = (new Date(res.timestamp)).toISOString()
                        let newEvent = new AlarmTableData(randomUUID(),laneName, count1, count2, count3, count4,  state, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if (ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/tamper-status") && res.result.tamperStatus === true) {
                    let state = 'Tamper';
                    const date = (new Date(res.timestamp)).toISOString()
                    let newEvent = new AlarmTableData(randomUUID(), laneName,0,0,0,0, state, date)
                    newEvent ? statusEvents.push(newEvent) : null;
                }
            });
        }
        tableRef.current = [...statusEvents, ...tableRef.current];
        setData(tableRef.current);

    }

    function RTMsgHandler(laneName: string, message: any, type: any) {
        let allEvents: AlarmTableData[] = [];

        if (message.values) {
            for (let value of message.values) {

                let date = (new Date(value.data.timestamp)).toISOString();
                let state = value.data.alarmState;

                let count1: number;
                let count2: number;
                let count3: number;
                let count4: number;

                if(state === 'Alarm'){
                    if(type === 'Neutron'){
                        state = 'Neutron Alarm'
                        count1 = value.data.neutronCount1;
                        count2 = value.data.neutronCount2;
                        count3 = value.data.neutronCount3;
                        count4 = value.data.neutronCount4;

                    }else if(type === 'Gamma'){
                        state = 'Gamma Alarm'
                        count1 = value.data.gammaCount1;
                        count2 = value.data.gammaCount2;
                        count3 = value.data.gammaCount3;
                        count4 = value.data.gammaCount4;
                    }

                }
                if(state.includes('Alarm') || value.data.alarmState.includes('Fault')){
                    let newEvent = new AlarmTableData(randomUUID(), laneName,count1, count2, count3, count4, state, date);
                    newEvent ? allEvents.push(newEvent) : null;
                }

                if(value.data.tamperStatus){
                    let newEvent = new AlarmTableData(randomUUID(), laneName, 0,0,0,0,'Tamper', date);
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
                RTMsgHandler(msgLaneName, message, 'Tamper')
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                RTMsgHandler(msgLaneName, message, 'Neutron')
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                RTMsgHandler(msgLaneName, message, 'Gamma')
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


