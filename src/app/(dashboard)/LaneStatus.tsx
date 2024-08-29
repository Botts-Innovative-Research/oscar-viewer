"use client";

import { Stack, Typography } from '@mui/material';
import LaneStatusItem from '../_components/LaneStatusItem';
import React, {useEffect, useRef, useState} from 'react';
import Link from "next/link";
import {findInObject} from "@/app/utils/Utils";
import {Protocols} from "@/lib/data/Constants";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {LaneStatusData} from "../../../types/new-types";
import {EventType} from "osh-js/source/core/event/EventType";

interface LaneStatusItem{
  id: number;
  laneName: string;
  status: string;
}

interface LaneStatusProps{
  laneStatusData?: LaneStatusData[]
}

function timeout(delay: number) {
  return new Promise( res => setTimeout(res, delay) );
}
export default function LaneStatus(props: LaneStatusProps) {
  const [statusBars, setStatus] = useState<LaneStatusItem[]>([]);
  const idVal = useRef(1);

  const [gammaDatasource, setGammaDatasource] = useState(null);
  const [neutronDatasource, setNeutronDatasource] = useState(null);
  const [tamperDatasource, setTamperDatasource] = useState(null);

  let server = `162.238.96.81:8781`;

  //generate swe api
  useEffect(() => {

    if (props.laneStatusData && props.laneStatusData.length > 0) {
      if(gammaDatasource === null){
        const newGammaSource = props.laneStatusData.map((data) => {
          const gammaSource = new SweApi(data.laneData.name, {
            tls: false,
            protocol: Protocols.WS,
            mode: Mode.REAL_TIME,
            endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
            resource: `/datastreams/${data.gammaDataStream[0].id}/observations`,
            connectorOpts: {
              username: 'admin',
              password: 'admin',
            },
          });
          gammaSource.connect();
          return gammaSource;
        });
        setGammaDatasource(newGammaSource);
      }

      if(neutronDatasource === null){
        const newNeutronSource =  props.laneStatusData.map((data) => {
          const neutronSource = new SweApi(data.laneData.name, {
            tls: false,
            protocol: Protocols.WS,
            mode: Mode.REAL_TIME,
            endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
            resource: `/datastreams/${data.gammaDataStream[0].id}/observations`,
            connectorOpts: {
              username: 'admin',
              password: 'admin',
            },
          });
          neutronSource.connect();
          return neutronSource;
        });
        setNeutronDatasource(newNeutronSource);
      }

      if(tamperDatasource === null){
        const newTamperSource = props.laneStatusData.map((data) => {
          const tamperSource = new SweApi(data.laneData.name, {
            tls: false,
            protocol: Protocols.WS,
            mode: Mode.REAL_TIME,
            endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
            resource: `/datastreams/${data.tamperDataStream[0].id}/observations`,
            connectorOpts: {
              username: 'admin',
              password: 'admin',
            },
          });
          tamperSource.connect();
          return tamperSource;
        });
        setTamperDatasource(newTamperSource);
      }
    }
  }, [props.laneStatusData]);

  useEffect(() => {
    if (gammaDatasource !== null) {
      const gammaSubscriptions = gammaDatasource.map((gamma: any) =>{
        gamma.subscribe((message: any[]) => handleStatusData(gamma.name, 'alarmState', message), [EventType.DATA]);
      });
    }
  }, [gammaDatasource]);

  useEffect(() => {
    if (tamperDatasource !== null) {
      const tamperSubscriptions = tamperDatasource.map((tamper: any) =>{
        tamper.subscribe((message: any[]) => handleTamperData(tamper.name, 'tamperStatus', message), [EventType.DATA]);
      });
    }
  }, [tamperDatasource]);

  useEffect(() => {
    if (neutronDatasource !== null) {
      const neutronSubscriptions = neutronDatasource.map((neutron: any) => {
        neutron.subscribe((message: any[]) => handleStatusData(neutron.name, 'alarmState', message), [EventType.DATA]);
      });
    }
  }, [neutronDatasource]);


  const handleStatusData = async (datasourceName: string, valueKey: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let newStatuses: LaneStatusItem[] = [];

    await timeout(5500);

    msgVal.forEach((value) => {
      const state = findInObject(value, valueKey);
      // console.log(state)
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
                  id: 'id',
                  //pass the lane name?
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