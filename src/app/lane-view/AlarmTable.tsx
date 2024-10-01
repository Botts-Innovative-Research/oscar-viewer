import EventTable from "../_components/event-table/EventTable";
import { IEventTableData } from "types/new-types";
import {AdjudicationData, EventTableData, EventTableDataCollection} from "@/lib/data/oscar/TableHelpers";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";


interface LaneViewProps {
  laneName: string
}

export default function AlarmTablePage(props: LaneViewProps) {

  const [data, setData] = useState<IEventTableData[]>([]); // Data to be displayed, depending on tableMode
  const idVal = useRef(1);

  let rtEndYear = new Date().setFullYear(new Date().getFullYear() + 1);
  let rtEndTime = new Date(rtEndYear).toISOString();

  const {laneMapRef} = useContext(DataSourceContext);
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
  const tableDataRef = useRef<EventTableDataCollection>(new EventTableDataCollection());
  const occupancyTableDataRef = useRef<EventTableData[]>([]);


  const datasourceSetup = useCallback(async () => {
    let laneDSMap = new Map<string, LaneDSColl>();
    // check for occupancy "Driver -Occupancy"
    for (let [laneid, lane] of laneMapRef.current.entries()) {
      laneDSMap.set(laneid, new LaneDSColl());
      for (let ds of lane.datastreams) {

        let idx: number = lane.datastreams.indexOf(ds);
        let batchDS = lane.datasourcesBatch[idx];
        let rtDS = lane.datasourcesRealtime[idx];
        let laneDSColl = laneDSMap.get(laneid);

        batchDS.properties.startTime = ds.properties.validTime[0];
        batchDS.properties.endTime = "now";

        rtDS.properties.startTime = "now"
        rtDS.properties.endTime = rtEndTime;
        rtDS.properties.endTime = "2025-01-01T08:13:25.845Z"

        if (ds.properties.name.includes('Driver - Occupancy')) {
          await fetchObservations(laneid, ds, ds.properties.validTime[0], "now");
          laneDSColl.addDS('occRT', rtDS);
        }
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

  async function fetchObservations(laneName: string, ds: typeof DataStream, timeStart: string, timeEnd: string) {
    let allResults: any[] = [];
    let allEvents: EventTableData[] = [];

    let initialRes = await ds.searchObservations(new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`}), 25000);
    while (initialRes.hasNext()) {
      let obsRes = await initialRes.nextPage();
      allResults.push(...obsRes);
      obsRes.map((obs: any) => {
        if (obs.result.gammaAlarm === true || obs.result.neutronAlarm === true && laneName === props.laneName) {
          let newEvent = new EventTableData(idVal.current++, laneName, obs.result, new AdjudicationData('kalyn', 0));

          let laneEntry = laneMapRef.current.get(laneName);
          const systemID = laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId);
          newEvent.setSystemIdx(systemID);

          newEvent ? allEvents.push(newEvent) : null;
        }
      });
    }

    occupancyTableDataRef.current = [...allEvents.filter((event) => event.laneId === props.laneName), ...occupancyTableDataRef.current];
    setData(occupancyTableDataRef.current);
  }

  function BatchMsgHandler(laneName: string, message: any) {
    console.log("Batch message received:", laneName, message);
  }

  function RTMsgHandler(laneName: string, message: any) {
      if (message.values) {
        for (let value of message.values) {
          if (value.data.gammaAlarm === true || value.data.neutronAlarm === true) {
            let newEvent = new EventTableData(idVal.current++, laneName, value.data, new AdjudicationData('kalyn', 0));

            let laneEntry = laneMapRef.current.get(laneName);
            const systemID = laneEntry.lookupSystemIdFromDataStreamId(value.data.datastreamId);
            newEvent.setSystemIdx(systemID);
            occupancyTableDataRef.current = [newEvent, ...occupancyTableDataRef.current];
          }
        }
        setData(occupancyTableDataRef.current);
      }
  }

  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
      const msgLaneName = laneName;
      laneDSColl.addSubscribeHandlerToAllBatchDS((message: any) => BatchMsgHandler(msgLaneName, message));
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('occRT', (message: any) => RTMsgHandler(msgLaneName, message));
      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane]);

  useEffect(() => {
    addSubscriptionCallbacks();
  }, [dataSourcesByLane]);

  useEffect(() => {
    let tableData = new EventTableDataCollection()
    tableData.setData(occupancyTableDataRef.current);
    tableDataRef.current = tableData
  }, [data]);


  return (
      <EventTable viewSecondary viewMenu viewAdjudicated  eventTable={tableDataRef.current}/>
  );
}