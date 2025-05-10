"use client";

import {LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';
import {setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";

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


  async function fetchLatestStatus() {
    const currentLaneName: string = props.dataSourcesByLane.keys().next().value;
    const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane.values().next().value;
    // Just use gamma datasource bc all lanes should have it, and gamma "Background" state is the most common
    const gammaDatasource = currentLaneDatasources.gammaRT[0];
    console.info("sample ds", gammaDatasource);
    const gammaDataStreamId = gammaDatasource.properties.resource.split('/')[2];
    const dsAPI = new DataStreams({
      endpointUrl: `${gammaDatasource.properties.endpointUrl}`,
      tls: gammaDatasource.properties.tls,
      connectorOpts: gammaDatasource.properties.connectorOpts
    });
    const gammaDataStream = await dsAPI.getDataStreamById(gammaDataStreamId);
    const latestObservationQuery = await gammaDataStream.searchObservations(new ObservationFilter({ resultTime: 'latest'}), 1);
    const latestObservationArray = await latestObservationQuery.nextPage();
    const latestObservation = latestObservationArray[0];
    console.info("Latest gamma observation: ", latestObservation);
    const initialLaneStatus: LaneStatusType = {
      id: -1,
      name: currentLaneName,
      status: latestObservation.result.alarmState
    }
    setLaneStatus(initialLaneStatus);
  }

  useEffect(() => {
    if(props.dataSourcesByLane.size > 0)
      fetchLatestStatus();

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