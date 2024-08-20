"use client";

import EventTable from '../_components/EventTable';

import { EventTableData, SelectedEvent } from 'types/new-types';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {useEffect, useMemo, useRef, useState} from "react";
import {findInObject} from "@/app/utils/Utils";
import {EventType} from "osh-js/source/core/event/EventType";

// const rows: EventTableData[] = [
//   { id: 1, secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
//   { id: 2, secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxNeutron: 25642, status: 'Neutron' },
//   { id: 3, secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, maxNeutron: 25642, status: 'Gamma & Neutron' },
// ];

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
  }), [occupancyId]);



  // read the table values from the datasources
  const handleOccupancyData = (datasource: any, message: any[]) => {

    // @ts-ignore
    const msgVal: any[] = message.values ||[];
    let newAlarmStatuses: EventTableData[] = [];

    msgVal.forEach((value) => {
      let lane = 'lane1';
      let occupancyCount = findInObject(value, 'occupancyCount'); //number
      let occupancyStart = findInObject(value, 'startTime'); //string
      let occupancyEnd = findInObject(value, 'endTime'); //string
      let gammaAlarm = findInObject(value, 'gammaAlarm'); //boolean
      let neutronAlarm = findInObject(value, 'neutronAlarm'); //boolean
      let maxGamma = findInObject(value, 'maxGamma');
      let maxNeutron = findInObject(value, 'maxNeutron');
      let statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : '';
      let adjUser = 'kalyn'; //get user from the account?
      let adjCode = 0; //get user from the adjudicatedSelect
      // const occStart = occupancyStart.split('T');
      // const occEnd = occupancyEnd.split('T');



      console.log('adj: ' + adjCode);

      if(gammaAlarm || neutronAlarm){
        const newAlarmStatus: EventTableData = {
          id: idVal.current++,
          secondaryInspection: false,
          laneId: lane, // Update
          occupancyId: occupancyCount,
          startTime: occupancyStart,
          endTime: occupancyEnd,
          maxGamma: gammaAlarm ? maxGamma : 'N/A',
          maxNeutron: neutronAlarm ? maxNeutron : 'N/A',
          status: statusType,
          adjudicatedUser: adjUser, // Update
          adjudicatedCode:  adjCode // Update,
        };

        //filter item from alarm table by adjudication code, and by the occupancy id
        let filterByAdjudicatedCode = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        setAlarmBars(prevState=>[newAlarmStatus, ...prevState.filter(item=>
          item.occupancyId !== occupancyCount
            || filterByAdjudicatedCode.includes(item.adjudicatedCode)
        )

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