"use client";

import { Stack, Typography } from '@mui/material';
import LaneStatusItem from '../_components/LaneStatusItem';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import Link from "next/link";
import {findInObject} from "@/app/utils/Utils";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

interface LaneStatusItem{
  id: number;
  laneName: string;
  status: string;
}


function timeout(delay: number) {
  return new Promise( res => setTimeout(res, delay) );
}
// export default function LaneStatus(props: LaneStatusProps) {
export default function LaneStatus() {
  const [statusBars, setStatus] = useState<LaneStatusItem[]>([]);
  const idVal = useRef(1);

  const {laneMapRef} = useContext(DataSourceContext);
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

  let alarmStatus = ['Alarm', 'Fault - Neutron High', 'Fault - Gamma Low', 'Fault - Gamma High', 'Online', 'Tamper'];

  const datasourceSetup = useCallback(async () => {

    let laneDSMap = new Map<string, LaneDSColl>();

    for (let [laneid, lane] of laneMapRef.current.entries()) {
      laneDSMap.set(laneid, new LaneDSColl());
      for (let ds of lane.datastreams) {

        let idx: number = lane.datastreams.indexOf(ds);
        let rtDS = lane.datasourcesRealtime[idx];
        let laneDSColl = laneDSMap.get(laneid);

        if (ds.properties.name.includes('Driver - Gamma Count')) {
          laneDSColl.addDS('gammaRT', rtDS);
        }

        if (ds.properties.name.includes('Driver - Neutron Count')) {
          laneDSColl.addDS('neutronRT', rtDS);
        }

        if (ds.properties.name.includes('Driver - Tamper')) {
          laneDSColl.addDS('tamperRT', rtDS);
        }
      }
      setDataSourcesByLane(laneDSMap);
    }
  }, [laneMapRef.current]);

  useEffect(() => {
    datasourceSetup();
  }, [laneMapRef.current]);

  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
      const msgLaneName = laneName;
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => handleStatusData(msgLaneName, message));
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => handleStatusData(msgLaneName, message));
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => handleTamperData(msgLaneName, message));

      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [dataSourcesByLane]);


  // handle the message data
  const handleStatusData = async (datasourceName: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let newStatuses: LaneStatusItem[] = [];


    msgVal.forEach((value) => {
      let state = findInObject(value, 'alarmState');
      console.log(state)
      if(state === 'Background' || state === 'Scan'){
        state = 'Online';
      }


      if(alarmStatus.includes(state)){
        const existingStatus = statusBars.find(item => item.laneName === datasourceName);
        // if(!existingStatus || existingStatus.status !== 'Tamper'){
        if(!existingStatus){
          const newStatus: LaneStatusItem = {
            id: idVal.current++,
            laneName: datasourceName,
            status: state
          };
          newStatuses.push(newStatus);
        }
      }

      // if (state === 'Alarm' || state === 'Fault - Neutron High'|| state === 'Fault - Gamma Low'|| state === 'Fault - Gamma High') {
      //   const newStatus: LaneStatusItem = {
      //     id: idVal.current++,
      //     laneName: datasourceName,
      //     status: state
      //   }
      //   newStatuses.push(newStatus);
      //
      // }
    });

    await timeout(5000);
    setStatus(prevStatus => [
      ...newStatuses,
      ...prevStatus.filter(item => item.laneName !== datasourceName || item.status === 'Tamper'
      // ...prevStatus.filter(item => item.laneName !== datasourceName || item.status === 'Online'
      // ...prevStatus.filter(item => {item.laneName !== datasourceName || !alarmStatus.includes(item.status)}
          // (item.status !== 'Alarm' && item.status !== 'Fault - Gamma Low' && item.status !== 'Fault - Gamma High' && item.status !== 'Fault - Neutron High')
      )]);
  };

  const handleTamperData = async (datasourceName: string, message: any[]) => {
    // @ts-ignore
    const msgVal: any[] = message.values || [];
    let tamperStatuses: LaneStatusItem[] = [];

    msgVal.forEach((value) => {
      const tamperState = findInObject(value, 'tamperStatus');
      if(tamperState) {
        const newStatus: LaneStatusItem ={
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