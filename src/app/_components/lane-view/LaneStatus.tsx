"use client";

import {LaneStatusItem, LaneStatusType} from '../../../../types/new-types';
import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LaneItem from './LaneItem';

interface LaneStatusProps{
  laneName: string,
}
export default function LaneStatus(props: LaneStatusProps) {

  const idVal = useRef(1);
  const {laneMapRef} = useContext(DataSourceContext);
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
  const [laneStatus, setLaneStatus] = useState<LaneStatusType>();

  const datasourceSetup = useCallback(async () => {
    // @ts-ignore
    let laneDSMap = new Map<string, LaneDSColl>();

    for (let [laneid, lane] of laneMapRef.current.entries()) {

      if(laneid === props.laneName){
        laneDSMap.set(laneid, new LaneDSColl());
        for (let ds of lane.datastreams) {

          let idx: number = lane.datastreams.indexOf(ds);
          let rtDS = lane.datasourcesRealtime[idx];
          let laneDSColl = laneDSMap.get(laneid);


          if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/gamma-gross-count")){

            laneDSColl.addDS('gammaRT', rtDS);
          }
          if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/alarm") && ds.properties.observedProperties[1].definition.includes("http://www.opengis.net/def/neutron-gross-count")){
            laneDSColl.addDS('neutronRT', rtDS);
          }
          if(ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/tamper-status")){
            laneDSColl.addDS('tamperRT', rtDS);
          }

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
        }else{
          updateStatus(laneName, 'Clear')
        }
      });

      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [dataSourcesByLane]);

  function updateStatus(laneName: string, newState: string){
    setTimeout(() => updateStatus(laneName, newState), 12000)

      const newStatus: LaneStatusType ={
        id: idVal.current++,
        name: laneName,
        status: newState
      }

      setLaneStatus(newStatus);
  }

  return (
      <>
        {laneStatus && (
            <LaneItem key={laneStatus.id} id={laneStatus.id} name={laneStatus.name} status={laneStatus.status} />
        )}
      </>
  );
}
