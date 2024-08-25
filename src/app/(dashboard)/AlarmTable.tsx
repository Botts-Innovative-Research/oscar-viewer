"use client";

import EventTable from '../_components/EventTable';
import {EventTableData, LaneOccupancyData, SelectedEvent} from 'types/new-types';
import {useEffect, useRef, useState} from "react";
import {findInObject} from "@/app/utils/Utils";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Protocols} from "@/lib/data/Constants";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";

interface AlarmTableProps {
  onRowSelect: (event:SelectedEvent)=> void;
  laneOccupancyData?: LaneOccupancyData[];
}

export default function AlarmTable(props: AlarmTableProps)
{
  const [occupancyTable, setOccupancyTable] = useState<EventTableData[]>([]);
  const [batchOccupancyTable, setBatchOccupancyTable] = useState<EventTableData[]>([]);
  const idVal = useRef(1);

  const [occupancyBatchDataSources, setBatchOccupancyDataSources] = useState(null);
  const [occupancyDataSources, setOccupancyDataSources] = useState(null);

  let server = `162.238.96.81:8781`;
  // let endTime = new Date((new Date().getTime() - 1000000)).toISOString();
  let endTime = "2024-08-23T08:13:25.845Z";
  let startTime = "2020-01-01T08:13:25.845Z";

  useEffect(() => {
    if (props.laneOccupancyData && props.laneOccupancyData.length > 0) {
      if (occupancyBatchDataSources === null) {
        const newBatchSource = props.laneOccupancyData.map((data) => {
          const batchSource = new SweApi(data.laneData.name, {
          startTime: startTime,
          endTime: endTime,
          tls: false,
          protocol: Protocols.WS,
          mode: Mode.BATCH,
          endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
          resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
          connectorOpts: {
            username: 'admin',
            password: 'admin',
          },
        });
          batchSource.connect();
          return batchSource;
        });
        setBatchOccupancyDataSources(newBatchSource);
      }

      if (occupancyDataSources === null) {
        const newOccSource = props.laneOccupancyData.map((data) => {
          const source = new SweApi(data.laneData.name, {
            tls: false,
            protocol: Protocols.WS,
            mode: Mode.REAL_TIME,
            endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
            resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
            connectorOpts: {
              username: 'admin',
              password: 'admin',
            },
          });
          source.connect();
          return source;
        });
        setOccupancyDataSources(newOccSource);
      }

    }
  }, [props.laneOccupancyData]);

  useEffect(() => {
    if (occupancyBatchDataSources !== null){
      const batchSubscriptions = occupancyBatchDataSources.map((datasource :any) =>{
        datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'BATCH'), [EventType.DATA]);
      });
    }
  }, [occupancyBatchDataSources]);

  // useEffect(() => {
  //   if (props.laneOccupancyData && props.laneOccupancyData.length > 0) {
  //     if (occupancyDataSources === null) {
  //       const newOccSource = props.laneOccupancyData.map((data) => {
  //         const source = new SweApi(data.laneData.name, {
  //           tls: false,
  //           protocol: Protocols.WS,
  //           mode: Mode.REAL_TIME,
  //           endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
  //           resource: `/datastreams/${data.occupancyStreams[0].id}/observations`,
  //           connectorOpts: {
  //             username: 'admin',
  //             password: 'admin',
  //           },
  //         });
  //         source.connect();
  //         return source;
  //       });
  //       setOccupancyDataSources(newOccSource);
  //     }
  //   }
  // }, [props.laneOccupancyData]);

  useEffect(() => {
    if (occupancyDataSources !== null){
      const occupancySubscriptions = occupancyDataSources.map((datasource: any) =>{
        datasource.subscribe((message: any) => handleOccupancyData(datasource.name, message, 'REAL_TIME'), [EventType.DATA]);
      });
    }
  }, [occupancyDataSources]);


  const handleOccupancyData = (laneName: string, message: any, mode: any) => {

    // @ts-ignore
    const msgVal: any[] = message.values ||[];

    msgVal.forEach((value) => {
      let occupancyCount = findInObject(value, 'occupancyCount'); //number
      let occupancyStart = findInObject(value, 'startTime'); //string
      let occupancyEnd = findInObject(value, 'endTime'); //string
      let gammaAlarm = findInObject(value, 'gammaAlarm'); //boolean
      let neutronAlarm = findInObject(value, 'neutronAlarm'); //boolean
      let maxGamma = findInObject(value, 'maxGamma');
      let maxNeutron = findInObject(value, 'maxNeutron');
      let statusType = gammaAlarm && neutronAlarm ? 'Gamma & Neutron' : gammaAlarm ? 'Gamma' : neutronAlarm ? 'Neutron' : '';

      if(gammaAlarm || neutronAlarm){
        const newAlarmStatus: EventTableData = {
          id: idVal.current++,
          secondaryInspection: false,
          laneId: laneName,
          occupancyId: occupancyCount,
          startTime: occupancyStart,
          endTime: occupancyEnd,
          maxGamma: maxGamma,
          maxNeutron: maxNeutron,
          status: statusType,
          adjudicatedUser: 'kalyn', // Update useSelector(selectCurrentUser)
          adjudicatedCode: 0 // Update,
        };


        //filter item from alarm table by adjudication code, and by the occupancy id
        let filterByAdjudicatedCode = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

        if(mode === 'BATCH'){
          setBatchOccupancyTable(prevState=>[newAlarmStatus, ...prevState.filter(item=> filterByAdjudicatedCode.includes(item.adjudicatedCode) || item.occupancyId !== occupancyCount)]);
        }
        else if( mode === 'REAL_TIME'){
          setOccupancyTable(prevState=>[newAlarmStatus, ...prevState.filter(item=> filterByAdjudicatedCode.includes(item.adjudicatedCode) || item.occupancyId !== occupancyCount)]);
        }
      }
    });
  }

  // Callback function to handle the selected row
  const handleSelectedRow = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    props.onRowSelect(event); // Pass to parent component
  };

   return (
    // <EventTable onRowSelect={handleSelectedRow} data={[...occupancyTable, ...batchOccupancyTable]}/>
    <EventTable onRowSelect={handleSelectedRow} data={occupancyTable.concat(batchOccupancyTable)}/>
  );

}
