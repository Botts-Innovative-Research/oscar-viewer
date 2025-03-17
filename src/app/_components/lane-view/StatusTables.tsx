"use client"

import {useCallback, useEffect, useRef, useState} from "react";
import {IAlarmTableData} from "../../../../types/new-types";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";

import {
    AlarmTableData,
    AlarmTableDataCollection,
} from "@/lib/data/oscar/TableHelpers";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import AlarmTable from "./AlarmTable";
import {isGammaDatastream, isNeutronDatastream, isTamperDatastream} from "@/lib/data/oscar/Utilities";

export default function StatusTables(props: {dataSourcesByLane: any}){

    const [data, setData] = useState<IAlarmTableData[]>([]);
    const [tableData, setTableData] = useState<AlarmTableDataCollection>(new AlarmTableDataCollection());
    const tableRef = useRef<AlarmTableData[]>([]);


    console.log("ds by lane", props.dataSourcesByLane)

    async function fetchObservations(laneName: string, ds: typeof DataStream, timeStart: string, timeEnd: string) {
        let allResults: any[] = [];

        let statusEvents: AlarmTableData[] =[];
        let initialRes = await ds.searchObservations(new ObservationFilter({ resultTime: `${timeStart}/${timeEnd}` }), 100);

        while (initialRes.hasNext()) {
            let obsRes = await initialRes.nextPage();
            allResults.push(...obsRes);

            obsRes.forEach((res: any) => {

                if(isNeutronDatastream(ds)){
                    let state = res.result.alarmState;
                    let count1 = res.result.neutronCount1;
                    let count2 = res.result.neutronCount2;
                    let count3 = res.result.neutronCount3;
                    let count4 = res.result.neutronCount4;

                    if(state === 'Alarm'){
                        state = 'Neutron Alarm'
                    }
                    if(state.includes('Alarm') || state.includes('Fault')){
                        const date = (new Date(res.timestamp)).toLocaleString();
                        let newEvent = new AlarmTableData(randomUUID(), laneName, count1, count2, count3, count4, state, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if(isGammaDatastream(ds)){
                    let state = res.result.alarmState;
                    let count1 = res.result.gammaCount1;
                    let count2 = res.result.gammaCount2;
                    let count3 = res.result.gammaCount3;
                    let count4 = res.result.gammaCount4;

                    if(state === 'Alarm'){
                        state = 'Gamma Alarm'
                    }

                    if(state.includes('Alarm') || state.includes('Fault')){
                        const date = (new Date(res.timestamp)).toLocaleString()
                        let newEvent = new AlarmTableData(randomUUID(),laneName, count1, count2, count3, count4,  state, date)
                        newEvent ? statusEvents.push(newEvent) : null;
                    }

                }

                if (isTamperDatastream(ds) && res.result.tamperStatus === true) {
                    let state = 'Tamper';
                    const date = (new Date(res.timestamp)).toLocaleString();
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


                // handle alarms
                let state = value.data.alarmState;
                let count1 = 0, count2 = 0, count3 = 0, count4 = 0;

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
                    const newEvent = new AlarmTableData(randomUUID(), laneName, count1, count2, count3, count4, state, value.data.timestamp);
                    allEvents.push(newEvent);
                } else if(state.includes('Fault')){
                    let newEvent = new AlarmTableData(randomUUID(), laneName, count1, count2, count3, count4, state, value.data.timestamp);
                    allEvents.push(newEvent);
                }

            }

            tableRef.current = [...allEvents, ...tableRef.current];

            setData(tableRef.current);
        }
    }

    function TamperMsgHandler(laneName:string, message: any){
        let tamperEvents: AlarmTableData[] = [];


        if (message.values) {
            for (let value of message.values) {

                //handle tamper
                const status = value.data.tamperStatus;

                const newEvent = new AlarmTableData(randomUUID(), laneName, 0, 0, 0, 0, 'Tamper', value.data.timestamp);

                status ? tamperEvents.push(newEvent) : '';
            }

            tableRef.current = [...tamperEvents, ...tableRef.current];

            setData(tableRef.current)
        }

    }

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of props.dataSourcesByLane.entries()) {

            // should only be one for now, but this whole process needs revisiting due to codebase changes introduced after initial implemntation
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                TamperMsgHandler(laneName, message);
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                RTMsgHandler(laneName, message, 'Neutron')
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                RTMsgHandler(laneName, message, 'Gamma')
            });

            laneDSColl.connectAllDS();
        }
    }, [props.dataSourcesByLane]);

    useEffect(() => {

    }, []);
    useEffect(() => {
        addSubscriptionCallbacks();
    }, [props.dataSourcesByLane]);


    useEffect(() => {
        let statusData = new AlarmTableDataCollection();
        statusData.setData(tableRef.current);
        const sortedData = [...statusData.data].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        statusData.setData(sortedData)
        setTableData(statusData);

    }, [data]);


    return (
        <AlarmTable alarmData={tableData}/>
    )
}





