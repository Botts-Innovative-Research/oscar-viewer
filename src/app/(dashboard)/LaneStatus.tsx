"use client";

import { Stack, Typography } from '@mui/material';
import LaneStatusItem from '../_components/LaneStatusItem';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {EventType} from 'osh-js/source/core/event/EventType';
import {Mode} from "osh-js/source/core/datasource/Mode";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

import Link from "next/link";
import {findInObject} from "@/app/utils/Utils";

interface LaneStatusItem{
  id: number;
  name: string;
  status: string;
}

const datasource = (name: string, streamId: string, server: string, start: string) => {
  return useMemo(() => new SweApi(name, {
    protocol: 'ws',
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
  // const {dataSources, masterTimeSyncRef} = useDSContext();

  const [statusBars, setStatus] = useState<LaneStatusItem[]>([]);
  const idVal = useRef(1);

  const [host, setHost] = useState("162.238.96.81");
  const server = `${host}:8781/sensorhub/api`;

  const start = useMemo(() => new Date((Date.now() - 600000)).toISOString(), []);
  const end = "2055-01-01T00:00:00.000Z";

  const gammaStreamId = 'jk2ltklu5i4o2';
  const tamperStreamId = '70rop8vggq3o0';
  const neutronStreamId = 'pqtvoprvnadm4';

  const gammaDataSource = datasource('lane1', gammaStreamId, server, start);
  const neutronDataSource = datasource('lane1', neutronStreamId, server, start);
  const tamperDataSource = datasource('lane1', tamperStreamId, server, start);

  const gammaStreamId2 = '9fgu8dcfmv6ti';
  const tamperStreamId2 = 'd06c5lmflph6c';
  const neutronStreamId2 = 'bv4ejrg5si840';

  const gammaDataSource2 = datasource('lane2', gammaStreamId2, server, start);
  const neutronDataSource2 = datasource('lane2', neutronStreamId2, server, start);
  const tamperDataSource2 = datasource('lane2', tamperStreamId2, server, start);


  const handleStatusData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let newStatuses: LaneStatusItem[] = [];

    await timeout(3000);

    msgVal.forEach((value) => {
      const state = findInObject(value, valueKey);
      //console.log(state)
      if (state === 'Alarm' || state === 'Fault - Neutron High'|| state === 'Fault - Gamma Low'|| state === 'Fault - Gamma High') {
        const newStatus: LaneStatusItem = {
          id: idVal.current++,
          name: datasourceName,
          status: state

        };
        newStatuses.push(newStatus);
      }
    });
    setStatus(prevStatus => [
        ...newStatuses,
      ...prevStatus.filter(item => item.name !== datasourceName ||
          (item.status !== 'Alarm' && item.status !== 'Fault - Gamma Low' && item.status !== 'Fault - Gamma High' && item.status !== 'Fault - Neutron High')
      )]);

  };

  const handleTamperData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let tamperStatuses: LaneStatusItem[] = [];

    msgVal.forEach((value) => {
      const tamperState = findInObject(value, 'tamperStatus');
      //console.log(tamperState)
      if(tamperState) {
        const newStatus: LaneStatusItem ={
          // id: statusBars.length === 0 ? 1 : statusBars[statusBars.length -1].id + 1,
          id: idVal.current++,
          name: datasourceName,
          status: 'Tamper'
        };
        tamperStatuses.push(newStatus);
      }
    });

    setStatus(prevStatuses => [
      ...tamperStatuses,
      ...prevStatuses.filter(item => item.name !== datasourceName || item.status !== 'Tamper')
    ]);

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

  }, [server, start]);

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
                <LaneStatusItem key={item.id} id={item.id} name={item.name} status={item.status} />
              </Link>
          ))}
        </Stack>
      </Stack>
  );
}
