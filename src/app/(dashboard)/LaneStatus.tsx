"use client";

import { Stack, Typography } from '@mui/material';
import LaneStatusItem from '../_components/LaneStatusItem';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Link from "next/link";
import {findInObject} from "@/app/utils/Utils";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {useSelector} from "react-redux";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
// import {getDatastreams} from "@/lib/state/OSHSlice";
import {selectLanes} from "@/lib/state/OSCARClientSlice";
import {FUTURE_END_TIME, Protocols, START_TIME} from "@/lib/data/Constants";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from 'osh-js/source/core/event/EventType';

interface LaneStatusItem{
  id: number;
  laneName: string;
  status: string;
}

function timeout(delay: number) {
  return new Promise( res => setTimeout(res, delay) );
}
export default function LaneStatus() {
  const [statusBars, setStatus] = useState<LaneStatusItem[]>([]);
  const idVal = useRef(1);

  // const ds : Datastream[] = useSelector((state:any) => Array.from(state.oshSlice.dataStreams));
  // const lanes: LaneMeta[] = useSelector((state:any) => Array.from(state.oscarClientSlice.lanes));

  const ds : Datastream[] = Array.from(useSelector((state: any) => state.oshSlice.dataStreams.values()));
  const lanes: LaneMeta[] = (useSelector(selectLanes));

  const filterLanes = useMemo(()=>{
    let gammaLanes: { [key: string]: Datastream[] }= {};
    let neutronLanes: { [key: string]: Datastream[] }= {};
    let tamperLanes: { [key: string]: Datastream[] }= {};

    lanes.forEach((lane, index) =>{
      let filteredStreams = ds.filter((stream) => lane.systemIds.includes(stream.parentSystemId));

      gammaLanes[`lane${index}`] = filteredStreams.filter((type) => type.name.includes('Driver - Gamma Count') || type.name.includes('Driver - Gamma Scan'));

      tamperLanes[`lane${index}`] = filteredStreams.filter((type) => type.name.includes('Tamper'));

      neutronLanes[`lane${index}`] = filteredStreams.filter((type) => type.name.includes('Driver - Neutron Count') || type.name.includes('Driver - Neutron Scan'));

    });
    return{gammaLanes, neutronLanes, tamperLanes};
  }, [lanes, ds]);


  // useEffect(() => {
  //   console.log('gamma', filterLanes.gammaLanes)
  // }, [filterLanes]);

  const createDataSource = useCallback(()=>{

    let gammaDataSources: {[key:string]: any[]} ={};
    let neutronDataSources: {[key:string]: any[]} ={};
    let tamperDataSources: {[key:string]: any[]} ={};


    Object.keys(filterLanes.gammaLanes).forEach((key) => {
      gammaDataSources[key] = filterLanes.gammaLanes[key].map((stream) => {
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
        const handleGamma = (message: any[]) => handleStatusData(getName(stream.parentSystemId), 'alarmState', message);
        source.connect()
        source.subscribe(handleGamma, [EventType.DATA]);
      });

    });

    Object.keys(filterLanes.neutronLanes).forEach((key) => {
      neutronDataSources[key] = filterLanes.neutronLanes[key].map((stream) => {
        const source = new SweApi(getName(stream.parentSystemId), {
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
        const handleNeutron = (message: any[]) => handleStatusData(getName(stream.parentSystemId),'alarmState', message);
        source.connect();
        source.subscribe(handleNeutron, [EventType.DATA]);
      });
    });


    Object.keys(filterLanes.tamperLanes).forEach((key) => {
      tamperDataSources[key] = filterLanes.tamperLanes[key].map((stream) => {
        const source = new SweApi(getName(stream.parentSystemId), {
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
        const handleTamper = (message: any[]) => handleTamperData(getName(stream.parentSystemId), 'tamperStatus', message);
        source.connect();
        source.subscribe(handleTamper, [EventType.DATA]);
      });
    });

    // Object.keys(filterLanes.gammaLanes).forEach((key) =>{
    //   gammaDataSources[key] = filterLanes.gammaLanes[key].map(stream => stream.generateSweApiObj({start: START_TIME, end: FUTURE_END_TIME}));
    // });
    // Object.keys(filterLanes.gammaLanes).forEach((key) =>{
    //   neutronDataSources[key] = filterLanes.neutronLanes[key].map(stream => stream.generateSweApiObj({start: START_TIME, end: FUTURE_END_TIME}));
    // });
    // Object.keys(filterLanes.gammaLanes).forEach((key) =>{
    //   tamperDataSources[key] = filterLanes.tamperLanes[key].map(stream => stream.generateSweApiObj({start: START_TIME, end: FUTURE_END_TIME}));
    // });

    return {gammaDataSources, neutronDataSources, tamperDataSources};
  }, [filterLanes]);


  useEffect(() => {
    createDataSource();
  }, [createDataSource]);


  function getName(parentId: string){
    const lane = lanes.find(lane => lane.systemIds.includes(parentId));
    return lane ? lane.name : 'unknown';
  }


  const handleStatusData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let newStatuses: LaneStatusItem[] = [];

    await timeout(5500);

    msgVal.forEach((value) => {
      const state = findInObject(value, valueKey);
      console.log(state)
      if (state === 'Alarm' || state === 'Fault - Neutron High'|| state === 'Fault - Gamma Low'|| state === 'Fault - Gamma High') {
        const newStatus: LaneStatusItem = {
          id: idVal.current++,
          laneName: datasourceName,
          status: state

        };
        newStatuses.push(newStatus);
      }
    });

    setStatus(prevStatus => [
        ...newStatuses,
      ...prevStatus.filter(item => item.laneName !== datasourceName ||
          (item.status !== 'Alarm' && item.status !== 'Fault - Gamma Low' && item.status !== 'Fault - Gamma High' && item.status !== 'Fault - Neutron High')
      )]);
  };

  const handleTamperData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let tamperStatuses: LaneStatusItem[] = [];

    msgVal.forEach((value) => {
      const tamperState = findInObject(value, valueKey);
      console.log(tamperState)
      if(tamperState) {
        const newStatus: LaneStatusItem ={
          // id: statusBars.length === 0 ? 1 : statusBars[statusBars.length -1].id + 1,
          id: idVal.current++,
          laneName: datasourceName,
          status: 'Tamper'
        };
        tamperStatuses.push(newStatus);
      }
    });

    setStatus(prevStatuses => [
      ...tamperStatuses,
      ...prevStatuses.filter(item => item.laneName !== datasourceName || item.status !== 'Tamper')
    ]);

  };



  return (
      <Stack padding={2} justifyContent={"start"} spacing={1}>
        <Typography variant="h6">Lane Status</Typography>
        <Stack spacing={1} sx={{ overflow: "auto", maxHeight: "100%" }}>
          {statusBars.map((item) => (
              //https://nextjs.org/docs/pages/api-reference/components/link
              //https://stackoverflow.com/questions/72221255/how-to-pass-data-from-one-page-to-another-page-in-next-js

              <Link href={{
                pathname: '/lane-view',
                query: {
                  //todo update id for page
                  id: 'id'
                }
              }}
                    passHref
                    key={item.id}>
                <LaneStatusItem key={item.id} id={item.id} name={item.laneName} status={item.status} />
              </Link>
          ))}
        </Stack>
      </Stack>
  );
}
