"use client";

import EventTable from '../_components/EventTable';

import { EventTableData, SelectedEvent } from 'types/new-types';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {useEffect, useMemo, useRef, useState} from "react";
import {findInObject} from "@/app/utils/Utils";
import {EventType} from "osh-js/source/core/event/EventType";

export default function AlarmTable(props: {
  onRowSelect: (event: SelectedEvent) => void;  // Return start/end time to parent
}){

  const [alarmBars, setAlarmBars] = useState<EventTableData[]>([]);
  const [host] = useState("192.168.1.69.")
  // const [host] = useState("162.238.96.81")
  const server = `${host}:8282/sensorhub/api`;
  // const server = `${host}:8781/sensorhub/api`;
  const start = useMemo(() => new Date((Date.now() - 600000)).toISOString(), []);
  const idVal = useRef(0);


  const occupancyId = "7icn7emn83tg2";
  // const occupancyId = "1tbv8s3niveii";
  // const gammaId = "9fgu8dcfmv6ti";
  // const neutronId = "bv4ejrg5si840";

  const [occupancyStart, setOccupancyStart] =  useState('');
  const [occupancyEnd, setOccupancyEnd] = useState('');

  const occupancyDatasource = useMemo(() => new SweApi("Occupancy Count", {
    protocol: 'ws',
    endpointUrl: server,
    resource: `/datastreams/${occupancyId}/observations`,
    startTime: start,
    endTime: "2055-01-01T00:00:00.000Z",
    mode: Mode.REAL_TIME,
    tls: false,
  }), []);


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
      const maxGamma = findInObject(value, 'maxGamma');
      const maxNeutron = findInObject(value, 'maxNeutron');
      const statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : '';
      // const laneId = findInObject(value, 'moduleName');

      let adjUser = 'kalyn'; //get user from the account?
      let adjCode = 0;//get user from the adjudicatedSelect
      let lane = 'lane1'

      console.log(adjCode);

      if(gammaAlarm || neutronAlarm){
        const newAlarmStatus: EventTableData = {
          id: idVal.current++,
          secondaryInspection: false,
          laneId: lane, // Update
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
    occupancyDatasource.connect();
    occupancyDatasource.subscribe(handleOccupancy, [EventType.DATA]);

    return() =>{
        occupancyDatasource.disconnect();
    };

    }, [server, start, occupancyStart, occupancyEnd]);



  // Callback function to handle the selected row
  const handleSelectedRow = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    props.onRowSelect(event); // Pass to parent component
  };

  return (
    <EventTable onRowSelect={handleSelectedRow} data={alarmBars} />
  );

}