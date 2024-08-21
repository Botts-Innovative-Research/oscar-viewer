"use client";

import EventTable from '../_components/EventTable';
import { EventTableData, SelectedEvent } from 'types/new-types';
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {findInObject} from "@/app/utils/Utils";
import {EventType} from "osh-js/source/core/event/EventType";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {useSelector} from "react-redux";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Protocols} from "@/lib/data/Constants";
import {Mode} from "osh-js/source/core/datasource/Mode";

const testRows: EventTableData[] = [
  { id: '1', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, status: 'Gamma' },
  { id: '2', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxNeutron: 25642, status: 'Neutron' },
  { id: '3', secondaryInspection: false, laneId: '1', occupancyId: '1', startTime: 'XX:XX:XX AM', endTime: 'XX:XX:XX AM', maxGamma: 25642, maxNeutron: 25642, status: 'Gamma & Neutron' },
];

export default function AlarmTable(props: {
  onRowSelect: (event: SelectedEvent) => void;  // Return start/end time to parent
}){

  const [alarmBars, setAlarmBars] = useState<EventTableData[]>([]);
  const idVal = useRef(0);

  const [occupancyStart, setOccupancyStart] =  useState('');
  const [occupancyEnd, setOccupancyEnd] = useState('');

  const ds : Datastream[] = useSelector((state:any) => Array.from(state.oshSlice.dataStreams));
  const lanes: LaneMeta[] = useSelector((state:any) => Array.from(state.oscarClientSlice.lanes));

  const filterLanes = useMemo(()=>{
    let occupancyLanes: { [key: string]: Datastream[] }= {};

    lanes.forEach((lane, index) =>{
      let filteredStreams = ds.filter((stream) => lane.systemIds.includes(stream.parentSystemId));
      occupancyLanes[`lane${index}`] = filteredStreams.filter((type) => type.name.includes('Driver - Occupancy'));

    });
    return{occupancyLanes};
  }, [lanes, ds]);

  const createDataSource = useCallback(()=>{

    let occupancyDataSource: {[key:string]: any[]} ={};

    Object.keys(filterLanes.occupancyLanes).forEach((key) => {
      occupancyDataSource[key] = filterLanes.occupancyLanes[key].map((stream) => {
        let source = new SweApi(getName(stream.parentSystemId), {
          protocol: Protocols.WS,
          endpointUrl: `162.238.96.81:8781/sensorhub/api`,
          resource: `/datastreams/${stream.id}/observations`,
          mode: Mode.REAL_TIME,
          tls: false,
          connectorOpts: {
            username: 'admin',
            password: 'admin',
          },
        });
        const handleOccupancy = (message: any[]) => handleOccupancyData(getName(stream.parentSystemId), message);
        source.connect()
        source.subscribe(handleOccupancy, [EventType.DATA]);
      });

    });

    return {occupancyDataSource};
  }, [filterLanes]);


  useEffect(() => {
    createDataSource();
  }, [createDataSource]);


  function getName(parentId: string){
    const lane = lanes.find(lane => lane.systemIds.includes(parentId));
    return lane ? lane.name : 'unknown';
  }


  const handleOccupancyData = (laneName: string, message: any[]) => {

    // @ts-ignore
    const msgVal: any[] = message.values ||[];
    let newAlarmStatuses: EventTableData[] = [];

    msgVal.forEach((value) => {
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
          laneId: laneName, // Update
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

  // Callback function to handle the selected row
  const handleSelectedRow = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    props.onRowSelect(event); // Pass to parent component
  };

   return (
    <EventTable onRowSelect={handleSelectedRow} data={alarmBars} />
  );

}