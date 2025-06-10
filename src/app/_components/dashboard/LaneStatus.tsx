"use client";

import {Box, Grid, Stack, Typography } from '@mui/material';
import LaneStatusItem from './LaneStatusItem';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import { setCurrentLane } from '@/lib/state/LaneViewSlice';
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";


export interface LaneStatusProps{
  id: number;
  name: string;
  isOnline: boolean;
  isTamper: boolean;
  isFault: boolean;
}

export default function LaneStatus(props: {dataSourcesByLane: any, initialLanes: any[]}) {
  const idVal = useRef(1);
  const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);

  let timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  let alarmStates= ['Alarm', 'Scan', 'Background']


  useEffect(() => {
    setStatusList(props.initialLanes);
  }, [props.initialLanes]);

  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of props.dataSourcesByLane.entries()) {

      laneDSColl.addSubscribeHandlerToALLDSMatchingName('connectionRT', (message: any) => {
        const connectedState = message.values[0].data.isConnected;
        updateStatus(laneName, (connectedState ? 'Online': 'Offline'));
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
        updateStatus(laneName, (state ? 'Tamper': 'TamperOff'));
      });


      laneDSColl.connectAllDS().then(console.log("Dashboard Statuses Connected"));
    }
  }, [props.dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [props.dataSourcesByLane]);


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


        // we still want to clear alarming states like fault after a certain time...
        setTimeout(() => updateStatus(laneName, 'Clear'), 15000);

        return [...updatedList];


      }else{
        const newLane: LaneStatusProps= {
          id: idVal.current++,
          name: laneName,
          isOnline: newState  === 'Online',
          isTamper: newState === 'Tamper',
          isFault: newState.includes('Fault'),
        }
        return [newLane, ... prevList]
      }
    });
  }

  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleLaneView = (laneName: string) =>{
    dispatch(setCurrentLane(laneName));

    router.push("/lane-view");
  }

  return (
      <Stack padding={2} justifyContent={"start"} spacing={1}>
        <Typography variant="h6">Lane Status</Typography>
        <>
          <Box sx={{overflowY: "auto", maxHeight: 275,  flexGrow: 1}}>
            {(
                <Grid container columns={{sm: 12, md: 24, lg: 36, xl: 48}} spacing={1}>
                  {statusList.map((item) => (
                      <Grid key={item.id} item sm={8} md={8} lg={8} xl={6}>
                        <div key={item.id} onClick={() => handleLaneView(item.name)}>
                          <LaneStatusItem
                              key={item.id}
                              id={item.id}
                              name={item.name}
                              isOnline={item.isOnline}
                              isFault={item.isFault}
                              isTamper={item.isTamper}
                          />
                        </div>
                      </Grid>
                  ))}
                </Grid>
            )}
          </Box>
        </>
      </Stack>
  );
}