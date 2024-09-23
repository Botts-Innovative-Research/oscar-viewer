"use client";

import { Stack, Typography } from '@mui/material';
import LaneStatusItem from '../_components/LaneStatusItem';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import Link from "next/link";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";

interface LaneStatusItem{
  id: number;
  name: string;
  isOnline: boolean;
  isAlarm: boolean;
  isTamper: boolean;
  isFault: boolean;
}


// export default function LaneStatus(props: LaneStatusProps) {
export default function LaneStatus() {
  const idVal = useRef(1);
  const [statusList, setStatusList] = useState<LaneStatusItem[]>([]);

  const {laneMapRef} = useContext(DataSourceContext);
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

  let timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const datasourceSetup = useCallback(async () => {

    let laneDSMap = new Map<string, LaneDSColl>();
    let newStatusList: LaneStatusItem[] = [];

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
      // const newLaneData = {
      newStatusList.push({
        id: idVal.current++,
        name: laneid,
        isOnline: false,
        isAlarm: false,
        isTamper: false,
        isFault: false,
      });
      // setStatusList(prevState => [newLaneData, ...prevState.filter(item => item.name !== laneid)])
      setStatusList(prevState => [...newStatusList, ...prevState.filter(item => !newStatusList.some(newItem => newItem.name === item.name))]);

      setDataSourcesByLane(laneDSMap);
    }
  }, [laneMapRef.current]);

  useEffect(() => {
    datasourceSetup();
  }, [laneMapRef.current]);


  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
        // reset timer
        restartTimer(laneName);
        const state = message.values[0].data.alarmState;

        if (state !== 'Scan' && state !== 'Background') {
          updateStatus(laneName, state);
        }

      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
        // reset timer
        restartTimer(laneName);
        const state = message.values[0].data.alarmState;

        if (state !== 'Scan' && state !== 'Background') {
          updateStatus(laneName, state);
        }
      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
        // reset timer
        restartTimer(laneName);
        const state = message.values[0].data.tamperStatus;
        if (state) {
          updateStatus(laneName, 'Tamper');
        } else {
          updateStatus(laneName, 'TamperOff')
        }
      });

      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [dataSourcesByLane]);

  function updateStatus(laneName: string, newState: string) {

    setStatusList((prevState) => {
      const existingLane = prevState.find((laneData) => laneData.name === laneName);

      if (existingLane) {
        const updatedList = prevState.map((laneData) => {
          if (laneData.name === laneName) {
            if (newState === 'Tamper') {
              return {...laneData, isTamper: true, isOnline: true}

            } else if (newState === 'Alarm') {
              return {...laneData, isAlarm: true, isFault: false, isOnline: true}

            } else if (newState === 'Fault - Neutron High' || newState === 'Fault - Gamma High' || newState === 'Fault - Gamma Low') {
              return {...laneData, isFault: true, isAlarm: false, isOnline: true}

            } else if (newState === 'TamperOff') {
              return {...laneData, isTamper: false, isOnline: true, timer: 15}

            } else if (newState === 'Clear') {
              return {...laneData, isAlarm: false, isFault: false, isOnline: true}

            } else if (newState === 'None') {
              return {...laneData, isAlarm: false, isOnline: false, isFault: false, isTamper: false}
            }
          }
          return laneData;
        });

        const updatedLane = updatedList.find((data) => data.name === laneName);

        if (newState !== 'Background' && newState !== 'Scan') {
          setTimeout(() => updateStatus(laneName, 'Clear'), 10000);
          const filteredStatuses = updatedList.filter((list) => list.name !== laneName);
          return [updatedLane, ...filteredStatuses]
        }

      } else {
        const newLaneData = {
          id: idVal.current++,
          name: laneName,
          isOnline: true,
          isAlarm: newState === 'Alarm',
          isTamper: newState === 'Tamper',
          isFault: newState.includes('Fault')
        }
        return [newLaneData, ...prevState];
      }
    });
  };

  /**Restart timer when msg comes in**/
  const restartTimer = useCallback((laneName: string) => {
    if(timersRef.current.has(laneName)){
      clearTimeout(timersRef.current.get(laneName));
    }

    const newTimer = setTimeout(() =>{
      console.log('timer status')
      updateStatus(laneName, 'Clear');
    }, 15000);

    timersRef.current.set(laneName, newTimer);
  },[]);


  // const updateTimer = useCallback((laneName: string) => {
  //   if(timersRef.current.has(laneName)){
  //     clearTimeout(timersRef.current.get(laneName));
  //   }
  //
  //   const newTimer = setTimeout(() =>{
  //     updateStatus(laneName, 'Offline');
  //   }, 1500);
  //
  //   timersRef.current.set(laneName, newTimer);
  // },[]);


  return (
      <Stack padding={2} justifyContent={"start"} spacing={1}>
        <Typography variant="h6">Lane Status</Typography>
        <>
          {statusList!= null &&(
              <Stack spacing={1} sx={{ overflow: "auto", maxHeight: "100%" }}>
                {statusList.map((item) => (
                    <Link href={{
                      pathname: '/lane-view',
                      query: {
                        //todo update id for page
                        id: 'id',
                      }
                    }}
                          passHref
                          key={item.id}>
                      <LaneStatusItem key={item.id} id={item.id} name={item.name} isOnline={item.isOnline} isAlarm={item.isAlarm} isFault={item.isFault} isTamper={item.isTamper} />
                    </Link>
                ))}
              </Stack>)}
        </>
      </Stack>
  );
}