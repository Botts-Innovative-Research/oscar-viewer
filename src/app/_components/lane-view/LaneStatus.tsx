"use client";

import {LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';
import {setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";

interface LaneStatusProps{
  dataSourcesByLane: Map<string, LaneDSColl>;
}
export default function LaneStatus(props: LaneStatusProps) {
  const dispatch = useAppDispatch();
  const idVal = useRef(1);
  const [laneStatus, setLaneStatus] = useState<LaneStatusType>();


  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of props.dataSourcesByLane.entries()) {
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
        updateStatus(laneName, (state ? 'Tamper' : 'Tamper Off'));

      });

      laneDSColl.connectAllDS();
    }
  }, [props.dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [props.dataSourcesByLane]);

  function updateStatus(laneName: string, newState: string){
    const newStatus: LaneStatusType ={
      id: idVal.current++,
      name: laneName,
      status: newState
    }
    // console.log("new status", newStatus)
    // set timer between each set status to just prevent flickering of status
    setTimeout(() => {
      setLaneStatus(newStatus);
    }, 10000);
    dispatch(setLastLaneStatus(newStatus))
  }

  return (
      <>
        {laneStatus && (
            <LaneItem key={laneStatus.id} id={laneStatus.id} name={laneStatus.name} status={laneStatus.status} />
        )}
      </>
  );
}