"use client";

import { Stack, Typography } from '@mui/material';

import LaneStatusItem from '../components/LaneStatusItem';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useDSContext} from "@/app/contexts/DataSourceContext";
import {EventType} from 'osh-js/source/core/event/EventType';
import {Mode} from "osh-js/source/core/datasource/Mode";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {findInObject} from "@/utils/Utils";

interface LaneStatusItem{
  id: number;
  name: string;
  status: string;
}

const datasource = (name: string, streamId: string, server: string, start: string) => {
  return useMemo(() => new SweApi(name, {
    protocol: 'wss',
    endpointUrl: server,
    resource: `/datastreams/${streamId}/observations`,
    startTime: start,
    endTime: "2055-01-01T00:00:00.000Z",
    mode: Mode.REAL_TIME,
    tls: false,
  }), [streamId]);
};

function timeout(delay: number) {
  return new Promise( res => setTimeout(res, delay) );
}
export default function LaneStatus() {
  const {dataSources, masterTimeSyncRef} = useDSContext();

  const [statusBars, setStatus] = useState<LaneStatusItem[]>([]);
  const idVal = React.useRef(1);

  const [host, setHost] = useState("localhost");
  // const server = `${host}:8282/sensorhub/sos`;
  const server = `${host}:8282/sensorhub/api`;
  const start = useMemo(() => new Date((Date.now() - 600000)).toISOString(), []);
  const end = "2055-01-01T00:00:00.000Z";

  const gammaStreamId = 'gcd5sgt3aolbk';
  const tamperStreamId = 'f6qq7krt5n78e';
  const neutronStreamId = 'gksl4kv7lb1us';

  const gammaStreamId2 = 'ukk100u6sd2ni';
  const tamperStreamId2 = 'obc17je365mmg';
  const neutronStreamId2 = '2e2mkq901vst8';

  const gammaDataSource = datasource('lane1-g', gammaStreamId, server, start);
  const neutronDataSource = datasource('lane1-n', neutronStreamId, server, start);
  const tamperDataSource = datasource('lane1-t', tamperStreamId, server, start);

  const gammaDataSource2 = datasource('g', gammaStreamId2, server, start);
  const neutronDataSource2 = datasource('n', neutronStreamId2, server, start);
  const tamperDataSource2 = datasource('t', tamperStreamId2, server, start);

  // let gammaDataSource = new SosGetResult('gamma', {
  //   endpointUrl: server,
  //   offeringID: "urn:osh:sensor:rapiscan:rpm001",
  //   observedProperty: "http://www.opengis.net/def/alarm",
  //   startTime: start,
  //   endTime: "2055-01-01T00:00:00.000Z",
  //   mode: Mode.REAL_TIME
  // });
  // let neutronDataSource = new SosGetResult('neutron', {
  //   endpointUrl: server,
  //   offeringID: "urn:osh:sensor:rapiscan:rpm001",
  //   observedProperty: "http://www.opengis.net/def/alarm",
  //   startTime: start,
  //   endTime: "2055-01-01T00:00:00.000Z",
  //   mode: Mode.REAL_TIME
  // });
  // let tamperDataSource = new SosGetResult('tamper', {
  //   endpointUrl: server,
  //   offeringID: "urn:osh:sensor:rapiscan:rpm001",
  //   observedProperty: "http://www.opengis.net/def/tamper-status",
  //   startTime: start,
  //   endTime: "2055-01-01T00:00:00.000Z",
  //   mode: Mode.REAL_TIME
  // });


  const handleStatusData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let newStatuses: LaneStatusItem[] = [];

    await timeout(2500);

    msgVal.forEach((value) => {
      const state = findInObject(value, valueKey);
      if (state === 'Alarm') {
        const newStatus: LaneStatusItem = {
          id: idVal.current++,
          name: datasourceName,
          status: state

        };
        newStatuses.push(newStatus);
      }
    });
    setStatus(prevStatus => [...newStatuses, ...prevStatus.filter(item => item.name !== datasourceName || (item.status !== 'Alarm') && item.name !== datasourceName)]);
    // setStatus(prevStatus => [...newStatuses, ...prevStatus.filter(state => state.status !== 'Alarm')]);

  };

  const handleTamperData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let tamperStatuses: LaneStatusItem[] = [];

    msgVal.forEach((value) => {

      const tamperState = findInObject(value, 'tamperStatus');
      console.log(tamperState)
      // let newStatus: LaneStatus | null = null;

      if(tamperState) {
        const newStatus: LaneStatusItem ={
          // id: statusBars.length === 0 ? 1 : statusBars[statusBars.length -1].id + 1,
          id: idVal.current++,
          name: tamperDataSource.name,
          status: 'Tamper'
        };
        tamperStatuses.push(newStatus);
      }
    });
    //TODO: if we have multiple streams i need to differentiate the states between each lane so maybe by the id?
    // setStatus(prevStatuses => [...tamperStatuses, ...prevStatuses.filter(state => state.status !== 'Tamper' )]);
    // setStatus(prevStatuses => [...tamperStatuses, ...prevStatuses.filter(state => state.id !== idVal.current-1)]);

    setStatus(prevStatuses => [...tamperStatuses, ...prevStatuses.filter(item => item.name !== datasourceName)]);

    await timeout(1000);
  };

  useEffect(() => {
    const handleGamma = (message: any[]) => handleStatusData(gammaDataSource.name, 'alarmState', message);
    const handleNeutron = (message: any[]) => handleStatusData(neutronDataSource.name, 'alarmState', message);
    const handleTamper = (message: any[]) => handleTamperData(tamperDataSource.name, 'tamperStatus', message);

    const handleGamma2 = (message: any[]) => handleStatusData(gammaDataSource2.name, 'alarmState', message);
    const handleNeutron2 = (message: any[]) => handleStatusData(neutronDataSource2.name, 'alarmState', message);
    const handleTamper2 = (message: any[]) => handleTamperData(tamperDataSource2.name, 'tamperStatus', message);

    gammaDataSource.connect();
    neutronDataSource.connect();
    tamperDataSource.connect();

    gammaDataSource2.connect();
    neutronDataSource2.connect();
    tamperDataSource2.connect();

    gammaDataSource.subscribe(handleGamma, [EventType.DATA]);
    neutronDataSource.subscribe(handleNeutron, [EventType.DATA]);
    tamperDataSource.subscribe(handleTamper, [EventType.DATA]);

    gammaDataSource2.subscribe(handleGamma2, [EventType.DATA]);
    neutronDataSource2.subscribe(handleNeutron2, [EventType.DATA]);
    tamperDataSource2.subscribe(handleTamper2, [EventType.DATA]);

    return () => {
      gammaDataSource.disconnect();
      neutronDataSource.disconnect();
      tamperDataSource.disconnect();

      gammaDataSource2.disconnect();
      neutronDataSource2.disconnect();
      tamperDataSource2.disconnect();
    };
  }, [gammaDataSource, gammaDataSource2, neutronDataSource,neutronDataSource2, tamperDataSource,tamperDataSource2, server, start]);


  // useEffect(() => {
  //   console.log("LaneStatus dataSources: ", dataSources);
  //   console.log("LaneStatus masterTimeSyncRef: ", masterTimeSyncRef);
  //   dataSources.set(gammaDataSource.getName(), gammaDataSource);
  //   dataSources.set(neutronDataSource.getName(), neutronDataSource);
  //   dataSources.set(tamperDataSource.getName(), tamperDataSource);
  // }, [dataSources, masterTimeSyncRef]);


  return (
    <Stack padding={2} justifyContent={"start"} spacing={1}>
      <Typography variant="h6">Lane Status</Typography>
      <Stack spacing={1} sx={{ overflow: "auto", maxHeight: "100%" }}>
        {statusBars.map((item) => (
          <LaneStatusItem key={item.id} id={item.id} name={item.name} status={item.status} />
        ))}
      </Stack>
    </Stack>
  );
}
