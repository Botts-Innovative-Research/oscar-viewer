"use client";

import {LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useEffect, useRef, useState} from 'react';

import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';
import {setLastLaneStatus} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {EventType} from "osh-js/source/core/event/EventType";

interface LaneStatusProps{
  dataSourcesByLane: LaneDSColl;
}

export default function LaneStatus(props: LaneStatusProps) {
  const dispatch = useAppDispatch();
  const idVal = useRef(1);
  const [laneStatus, setLaneStatus] = useState<LaneStatusType>();


  const currentLane = useSelector((state: RootState) => state.laneView.currentLane);


  const addSubscriptionCallbacks = useCallback(() => {

    // const gammaDs = props.dataSourcesByLane.getDSArray("gammaRT")[0];
    // const neutronDs = props.dataSourcesByLane.getDSArray("neutronRT")[0]
    // const tamperDs = props.dataSourcesByLane.getDSArray("tamperRT")[0];

    props.dataSourcesByLane.addSubscribeHandlerToALLDSMatchingName("gammaRT", (message: any) => {
      console.log("gamma message: ", message);
      const state = message.values[0].data.alarmState;
      updateStatus(currentLane, state);
    })

    props.dataSourcesByLane.addSubscribeHandlerToALLDSMatchingName("neutronRT", (message: any) => {
      const state = message.values[0].data.alarmState;
      updateStatus(currentLane, state);
    })

    props.dataSourcesByLane.addSubscribeHandlerToALLDSMatchingName("tamperRT", (message: any) => {
      const state = message.values[0].data.tamperStatus;
      if(state){
        updateStatus(currentLane, 'Tamper')
      }
    })

    props.dataSourcesByLane.connectAllDS().then(console.log("Lane View Statuses Connected"));

  }, [props.dataSourcesByLane]);

  function handleAlarms(ds)

  async function fetchLatestStatus() {

    const currentLaneDatasources: LaneDSColl = props.dataSourcesByLane;

    // Just use gamma datasource bc all lanes should have it, and gamma "Background" state is the most common
    const gammaDatasource = currentLaneDatasources.gammaRT[0];
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

    const initialLaneStatus: LaneStatusType = {
      id: -1,
      name: currentLane,
      status: latestObservation.result.alarmState
    }
    setLaneStatus(initialLaneStatus);
  }

  useEffect(() => {
    if(props.dataSourcesByLane)
      fetchLatestStatus();

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
    }, 5000);
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