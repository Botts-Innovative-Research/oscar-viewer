"use client";

import {LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';
import {selectLastLaneStatus, setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useSelector} from "react-redux";

interface LaneStatusProps{
  dataSourcesByLane: Map<string, LaneDSColl>;
}
export default function LaneStatus(props: LaneStatusProps) {
  const dispatch = useAppDispatch();
  const lastLaneStatus = useSelector(selectLastLaneStatus);
  const idVal = useRef(1);
  const [laneStatus, setLaneStatus] = useState<LaneStatusType>(lastLaneStatus);

//todo: add in a historic request so initial lanestatus is not null

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
        updateStatus(laneName, (state ? 'Tamper' : 'Clear'));

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
    // set timer between each set status to just prevent flickering of status
    setTimeout(() => {
      setLaneStatus(newStatus);

      dispatch(setLastLaneStatus(newStatus))
    }, 10000);

  }

  return (
      <>
        {laneStatus && (
            <LaneItem key={laneStatus.id} id={laneStatus.id} name={laneStatus.name} status={laneStatus.status} />
        )}
      </>
  );
}
