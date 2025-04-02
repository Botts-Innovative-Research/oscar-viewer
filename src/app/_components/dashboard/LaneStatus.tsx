"use client";

import {Box, Grid, List, Stack, Typography } from '@mui/material';
import LaneStatusItem from './LaneStatusItem';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import Link from "next/link";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {
  isConnectionDatastream,
  isGammaDatastream,
  isNeutronDatastream,
  isTamperDatastream
} from "@/lib/data/oscar/Utilities";

interface LaneStatusProps{
  id: number;
  name: string;
  isOnline: boolean;
  isTamper: boolean;
  isFault: boolean;
}


export default function LaneStatus() {
  const idVal = useRef(1);
  const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);

  const {laneMapRef} = useContext(DataSourceContext);
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

  let timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  let alarmStates= ['Alarm', 'Scan', 'Background']

  const datasourceSetup = useCallback(async () => {

    let laneDSMap = new Map<string, LaneDSColl>();
    let newStatusList: LaneStatusProps[] = [];

    for (let [laneid, lane] of laneMapRef.current.entries()) {
      laneDSMap.set(laneid, new LaneDSColl());
      for (let ds of lane.datastreams) {

        let idx: number = lane.datastreams.indexOf(ds);
        let rtDS = lane.datasourcesRealtime[idx];
        let laneDSColl = laneDSMap.get(laneid);

        if(isGammaDatastream(ds)){
          laneDSColl.addDS('gammaRT', rtDS);
        }
        if(isNeutronDatastream(ds)){
          laneDSColl.addDS('neutronRT', rtDS);
        }
        if(isTamperDatastream(ds)){
          laneDSColl.addDS('tamperRT', rtDS);
        }
        if(isConnectionDatastream(ds)){
          laneDSColl.addDS('connectionRT', rtDS);
        }

      }

      newStatusList.push({
        id: idVal.current++,
        name: laneid,
        isOnline: false,
        isTamper: false,
        isFault: false,
      });

      setStatusList(prevState => [...newStatusList,
        ...prevState.filter(item => !newStatusList.some(newItem => newItem.name === item.name))]);

      setDataSourcesByLane(laneDSMap);

    }
  }, [laneMapRef.current]);

  useEffect(() => {
    datasourceSetup();
  }, [laneMapRef.current]);


  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('connectionRT', (message: any) => {
        const connectedState = message.values[0].data.isConnected;
        if (connectedState) {
          updateStatus(laneName, 'Online');
        } else {
          updateStatus(laneName, 'Offline')
        }

      });

      laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
        const state = message.values[0].data.alarmState;
        updateStatus(laneName, state);

      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
        const state = message.values[0].data.alarmState;
        updateStatus(laneName, state);
      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
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

    clearTimeout(timersRef.current.get(laneName));

    setStatusList((prevList) => {
      let existingLane = prevList.find((lane) => lane.name === laneName)

      if(existingLane){
        const updatedList = prevList.map((laneData) => {
          if (laneData.name === laneName) {
            if (newState === 'Tamper') {

              return {...laneData, isTamper: true, isOnline: true}

            }else if (newState === 'TamperOff') {

              return {...laneData, isTamper: false, isOnline: true}

            }else if (newState === 'Fault - Neutron High' || newState === 'Fault - Gamma High' || newState === 'Fault - Gamma Low') {
              return {...laneData, isFault: true, isOnline: true}

            }else if (newState === 'Clear') {
              return {...laneData, isFault: false }
            } else if (newState === 'Online'|| alarmStates.includes(newState)) {

              return {...laneData, isFault: false, isOnline: true}

            }else if (newState === 'Offline') {

              return {...laneData, isOnline: false, isFault: false, isTamper: false}
            }
          }
          return laneData;
        });


        // dont reorder if state === alarm, bkg, scan or online
        // if(['Alarm', 'Scan', 'Background', 'Clear', 'Online', 'TamperOff', 'Offline', 'Tamper', 'Fault'].includes(newState)) {
        //   //check if online status and push to front
        //   const offlineStatues = updatedList.filter((list) => !list.isOnline);
        //   const onlineStatuses = updatedList.filter((list) => list.isOnline);
        //
        //   return  [...offlineStatues, ...onlineStatuses];
        // }
        // put offline, fault, tamper at the top of the list
        // const updatedLane = updatedList.find((data) => data.name === laneName);
        //

        // we still want to clear alarming states like fault after a certain time...
        setTimeout(() => updateStatus(laneName, 'Clear'), 15000);
        // const filteredStatuses = updatedList.filter((list) => list.name !== laneName);
        // const offlineStatuses = updatedList.filter((list) => !list.isOnline);
        // const onlineStatuses = updatedList.filter((list) => list.isOnline);
        //
        // return [...offlineStatuses, ...onlineStatuses]

        return [...updatedList];


      }else{
        const newLane: LaneStatusProps= {
          id: idVal.current++,
          name: laneName,
          isOnline: true,
          isTamper: newState === 'Tamper',
          isFault: newState.includes('Fault'),
        }
        return [newLane, ... prevList]
      }
    });
  }


  return (
      <Stack padding={2} justifyContent={"start"} spacing={1}>
        <Typography variant="h6">Lane Status</Typography>
        <>
          <Box sx={{overflowY: "auto", maxHeight: 120,  flexGrow: 1}}>
            {(
                <Grid container columns={{sm: 12, md: 24, lg:36, xl:48}} spacing={1} >
                  {statusList.map((item) => (
                      <Grid  key={item.id} item xs={12}>
                        <Link href={{
                          pathname: '/lane-view',
                          query: {
                            name: item.name,
                          }
                        }}
                              passHref

                        >

                          <LaneStatusItem
                              key={item.id}
                              id={item.id}
                              name={item.name}
                              isOnline={item.isOnline}
                              isFault={item.isFault}
                              isTamper={item.isTamper}
                          />

                        </Link>
                      </Grid>
                  ))}
                </Grid>
            )}
          </Box>
        </>
      </Stack>
  );
}