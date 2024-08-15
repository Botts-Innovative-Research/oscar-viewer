"use client";

import EventTable from '../_components/EventTable';

import { EventTableData, SelectedEvent } from 'types/new-types';
import { EventTableData } from 'types/new-types';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {useEffect, useMemo, useRef, useState} from "react";
import {findInObject} from "@/app/utils/Utils";
import {EventType} from "osh-js/source/core/event/EventType";


export default function AlarmTable(props: {
  onRowSelect: (event: SelectedEvent) => void;  // Return start/end time to parent
}){

  const [alarmBars, setAlarmBars] = useState<EventTableData[]>([]);
  const [host] = useState("162.238.96.81")
  const server = `${host}:8781/sensorhub/api`;
  const start = useMemo(() => new Date((Date.now() - 600000)).toISOString(), []);
  const idVal = useRef(0);


  const occupancyId = "1tbv8s3niveii";
  // const gammaId = "9fgu8dcfmv6ti";
  // const neutronId = "bv4ejrg5si840";

  const [occupancyStart, setOccupancyStart] =  useState('');
  const [occupancyEnd, setOccupancyEnd] = useState('');

  // const [maxGamma, setMaxGamma] = useState(0);
  // const [maxNeutron, setMaxNeutron] = useState(0);

  const occupancyDatasource = useMemo(() => new SweApi("Occupancy Count", {
    protocol: 'ws',
    endpointUrl: server,
    resource: `/datastreams/${occupancyId}/observations`,
    startTime: start,
    endTime: "2055-01-01T00:00:00.000Z",
    mode: Mode.REAL_TIME,
    tls: false,
  }), []);

  // const gammaDatasource = useMemo(() => new SweApi("Occupancy Count", {
  //   protocol: 'ws',
  //   endpointUrl: server,
  //   resource: `/datastreams/${gammaId}/observations`,
  //   startTime: occupancyStart,
  //   endTime: occupancyEnd,
  //   mode: Mode.REAL_TIME,
  //   tls: false,
  // }), []);
  //
  // const neutronDatasource = useMemo(() => new SweApi("Occupancy Count", {
  //   protocol: 'ws',
  //   endpointUrl: server,
  //   resource: `/datastreams/${neutronId}/observations`,
  //   startTime: occupancyStart,
  //   endTime: occupancyEnd,
  //   mode: Mode.REAL_TIME,
  //   tls: false,
  // }), []);

  //here is where we will find the max gamma/max neutron to populate the field on the alarm table
  // const handleCounts = (datasource: any,
  //                       valueKey: string,
  //                       message: any[]) => {
  //
  //
  //   let max = 0;
  //   let maxArray: number[] = [];
  //
  //   // @ts-ignore
  //   const msgVal: any[] = message.values || [];
  //
  //   msgVal.forEach((value) => {
  //
  //       let count1 = findInObject(value, `${valueKey}1`);
  //       let count2 = findInObject(value, `${valueKey}2`);
  //       let count3 = findInObject(value, `${valueKey}3`);
  //       let count4 = findInObject(value, `${valueKey}4`);
  //     maxArray.push(Math.max(count1, count2, count3, count4));
  //     max = Math.max(max, ...maxArray);
  //
  //   });
  //
  //   return Math.max(max);
  // };

  // async function getMaxCount(datastreamId: string, valueId: string, startTime: string, endTime:string) {
  //   // const response = await fetch(`http://162.238.96.81:8781/sensorhub/api/datastreams/${datastreamId}/observations?resultTime=${startTime}/${endTime}`)
  //   const response = await fetch(`http://${host}:8781/sensorhub/api/datastreams/${datastreamId}/observations?phenomenonTime=${startTime}/${endTime}`);
  //
  //   if(!response.ok){
  //     throw new Error(`Response status:  ${response.status}`);
  //   }
  //   const json = await response.json();
  //   // console.log(json);
  //
  //   const items = json.items;
  //
  //   // console.log(JSON.stringify(items))
  //   const result = items.result;
  //   console.log(result);
  //
  //   let max = 0;
  //   let maxArray: number[] = [];
  //
  //   // const msgVal: any[] = items.result || [];
  //   // // @ts-ignore
  //   // msgVal.forEach((value) =>{
  //   //   console.log(value);
  //     // const count1 = findInObject(value, `${valueId}1`);
  //     // const count2 = findInObject(value, `${valueId}2`);
  //     // const count3 = findInObject(value, `${valueId}3`);
  //     // const count4 = findInObject(value, `${valueId}4`);
  //
  //   items.forEach((item: any) =>{
  //     const result = item.result;
  //     // console.log('result: '+ JSON.stringify(result));
  //     if(result){
  //
  //       const count1 = items[0].result[`${valueId}1`];
  //       const count2 = items[0].result[`${valueId}2`];
  //       const count3 = items[0].result[`${valueId}3`];
  //       const count4 = items[0].result[`${valueId}4`];
  //
  //       max = Math.max(count1, count2, count3, count4);
  //       maxArray.push(max);
  //     }
  //
  //   });
  //
  //   if(datastreamId === gammaId){
  //      return maxGammaCps =  Math.max(...maxArray);
  //   }else{
  //     return maxCps =  Math.max(...maxArray);
  //   }
  //
  //   // });
  //   // console.log(json);
  //   // const count = handleCounts(occupancyDatasource.getName(), valueId, result);
  //
  //   // return maxArray.length > 0 ? Math.max(...maxArray) : 0;
  // }

  const handleOccupancyData = (datasource: string, message: any[]) => {

    // @ts-ignore
    const msgVal: any[] = message.values ||[];
    let newAlarmStatuses: EventTableData[] = [];

    msgVal.forEach((value) => {
      const occupancyCount = findInObject(value, 'occupancyCount'); //number
      const occupancyStart = findInObject(value, 'startTime'); //string
      const occupancyEnd = findInObject(value, 'endTime'); //string
      const gammaAlarm = findInObject(value, 'gammaAlarm'); //boolean
      const neutronAlarm = findInObject(value, 'neutronAlarm'); //boolean
      // const maxGamma = findInObject(value, 'maxGamma');
      // const maxNeutron = findInObject(value, 'maxNeutron');
      const statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : '';
      // const laneId = findInObject(value, 'moduleName');
      let maxGamma = 0;
      let maxNeutron = 0;
      let adjUser = 'kalyn'; //get user from the account?
      let adjCode = 0;//get user from the adjudicatedSelect

      console.log(adjCode);

      if(gammaAlarm || neutronAlarm){
        const newAlarmStatus: EventTableData = {
          id: idVal.current++,
          secondaryInspection: false,
          laneId: 'lane', // Update
          occupancyId: occupancyCount,
          startTime: occupancyStart,
          endTime: occupancyEnd,
          maxGamma: gammaAlarm ? maxGamma : 0,
          maxNeutron: neutronAlarm ? maxNeutron : 0,
          status: statusType,
          adjudicatedUser: adjUser, // Update
          adjudicatedCode: adjCode  // Update,
        };

        setAlarmBars(prevState=>[newAlarmStatus, ...prevState.filter(item=>
          item.occupancyId !== occupancyCount)
        ]);
      }
    });
  }

  useEffect(() => {
      const handleOccupancy = (message: any[]) => handleOccupancyData(occupancyDatasource, message);

    //   const handleGamma = async(message: any[]) =>{
    //     console.log('gamma handling')
    //     const newMaxGamma = handleCounts(gammaDatasource, 'gammaGrossCount', message);
    //     console.log(newMaxGamma);
    //     setMaxGamma(newMaxGamma);
    //   };
    //
    // const handleNeutron = async(message: any[]) =>{
    //   const newMaxNeutron = handleCounts(neutronDatasource, 'neutronGrossCount', message);
    //   console.log(newMaxNeutron);
    //   setMaxNeutron(newMaxNeutron);
    // };

    occupancyDatasource.connect();
    occupancyDatasource.subscribe(handleOccupancy, [EventType.DATA]);

    // gammaDatasource.connect();
    // gammaDatasource.subscribe(handleGamma, [EventType.DATA]);
    //
    // neutronDatasource.connect();
    // neutronDatasource.subscribe(handleNeutron, [EventType.DATA]);

      // async (message: any[]) => await gammaDatasource.subscribe(setMaxGamma(handleCounts(gammaDatasource, 'gammaGrossCount', message, occupancyStart, occupancyEnd)), EventType.DATA);
      // async (message: any[]) => await  neutronDatasource.subscribe(setMaxNeutron(handleCounts(gammaDatasource, 'gammaGrossCount', message, occupancyStart, occupancyEnd)), EventType.DATA);

    return() =>{
        occupancyDatasource.disconnect();
        // gammaDatasource.disconnect();
        // neutronDatasource.disconnect();
    };

    }, [server, start, occupancyStart, occupancyEnd]);



  // Callback function to handle the selected row
  const handleSelectedRow = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    props.onRowSelect(event); // Pass to parent component
  };

  return (
    <EventTable onRowSelect={handleSelectedRow} data={rows} />
  );

}