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

// // Generate 50 mock lanes
// const generateMockLanes = (): LaneStatusProps[] => {
//   const areas = ['North', 'South', 'East', 'West', 'Central'];
//   return Array.from({ length: 50 }, (_, index) => ({
//     id: index + 1,
//     name: `${areas[Math.floor(Math.random() * areas.length)]} Lane ${index + 1}`,
//     isOnline: Math.random() > 0.1, // 90% chance of being online
//     isTamper: Math.random() > 0.9, // 10% chance of tamper
//     isFault: Math.random() > 0.95, // 5% chance of fault
//   }));
// };

export default function LaneStatus(props: {dataSourcesByLane: any}) {
  const idVal = useRef(1);
  // const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);
  const [statusList, setStatusList] = useState<LaneStatusProps[]>([]);
  // const [statusList, setStatusList] = useState<LaneStatusProps[]>(generateMockLanes());

  let timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  let alarmStates= ['Alarm', 'Scan', 'Background']


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

      laneDSColl.connectAllDS();
    }
  }, [props.dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [props.dataSourcesByLane]);


    // Add some simulated random updates for demo purposes
    // useEffect(() => {
    //   const interval = setInterval(() => {
    //     setStatusList(prevList => {
    //       const updatedList = [...prevList];
    //       const randomIndex = Math.floor(Math.random() * updatedList.length);
    //       const randomChange = Math.random();
    //
    //       // Randomly change one of the states
    //       if (randomChange < 0.33) {
    //         updatedList[randomIndex].isOnline = !updatedList[randomIndex].isOnline;
    //       } else if (randomChange < 0.66) {
    //         updatedList[randomIndex].isTamper = !updatedList[randomIndex].isTamper;
    //       } else {
    //         updatedList[randomIndex].isFault = !updatedList[randomIndex].isFault;
    //       }
    //
    //       return updatedList;
    //     });
    //   }, 3000); // Update every 3 seconds
    //
    //   return () => clearInterval(interval);
    // }, []);

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
          <Box sx={{overflowY: "auto", maxHeight: 200,  flexGrow: 1}}>
            {(
                <Grid container columns={{sm: 12, md: 24, lg: 36, xl: 48}} spacing={1}>
                  {statusList.map((item) => (
                      <Grid key={item.id} item sm={6} md={6} lg={4} xl={4}>
                        <Link href={{
                          pathname: '/lane-view',
                          query: {
                            name: item.name,
                          }
                        }}
                              passHref
                              style={{textDecoration: 'none'}}

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