 "use client";

import { Grid, Pagination, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import "../style/cameragrid.css";
import { Datastream } from '@/lib/data/osh/Datastreams';
import { useSelector } from 'react-redux';
import { LaneMeta } from '@/lib/data/oscar/LaneCollection';
import CameraGridVideo from '../_components/video/VideoComponent';
import { selectDatastreams } from '@/lib/state/OSHSlice';
import { selectLanes } from '@/lib/state/OSCARClientSlice';
import { RootState } from '@/lib/state/Store';
import VideoComponent from '../_components/video/VideoComponent';
import VideoStatusWrapper from '../_components/video/VideoStatusWrapper';
import {EventType} from 'osh-js/source/core/event/EventType';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import { Protocols } from "@/lib/data/Constants";
import {Mode} from 'osh-js/source/core/datasource/Mode';


interface LaneWithVideo {
  laneData: LaneMeta,
  videoDatastreams: Datastream[],
  gammaDatastream: Datastream,
  neutronDatastream: Datastream
}

/*
List of livestreams
Click video to go somewhere
Highlight video and push to front given state
Push new occupancies to beginning of non-alarming states
Check with salwa nextconfig

If lane has multiple videostreams, just use one or 
implement ability to switch between videostreams
*/
export default function CameraGrid() {
  const dss: Datastream[] = Array.from(useSelector((state: RootState) => state.oshSlice.dataStreams.values()));

  const lanes: LaneMeta[] = useSelector(selectLanes);
  const [lanesWithVideo, setLanesWithVideo] = useState<LaneWithVideo[] | null>(null);
  const [laneStatuses, setLaneStatuses] = useState<Map<LaneMeta, string>>(new Map<LaneMeta, string>());

  useEffect(() => {
    if(lanesWithVideo == null || lanesWithVideo.length == 0 && dss.length > 0) {
      let laneData: LaneWithVideo[] = []

      lanes.map((lane) => {
        console.log(lane)
        const videoDatastreams = dss.filter((ds) => (lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Video") && ds.name.includes("Lane")));
        const gammaDatastreams = dss.filter((ds) => (lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Gamma") && ds.name.includes("Count")));
        const neutronDatastreams = dss.filter((ds)=>(lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Neutron") && ds.name.includes("Count")));

        const laneWithVideo: LaneWithVideo = {
          laneData: lane,
          videoDatastreams: videoDatastreams,
          gammaDatastream: gammaDatastreams[0],
          neutronDatastream: neutronDatastreams[0]
        };

        if(laneWithVideo.gammaDatastream.datasource == null) {
          laneWithVideo.gammaDatastream.datasource = new SweApi(laneWithVideo.gammaDatastream.id, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${laneWithVideo.gammaDatastream.id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
          });
        }

        if(laneWithVideo.neutronDatastream.datasource == null) {
          laneWithVideo.neutronDatastream.datasource = new SweApi(laneWithVideo.neutronDatastream.id, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${laneWithVideo.neutronDatastream.id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
          });
        }

        laneData.push(laneWithVideo);
      });

      console.log(laneData);
      setLanesWithVideo(laneData);
    }
  }, [dss]);

  async function connectAndSubscribe(lane: LaneWithVideo, sweApi: typeof SweApi) {
    if(!await sweApi.isConnected()) {
      await sweApi.connect();
    }

    await sweApi.subscribe((message: any) => {
      console.log("message received: ", JSON.stringify(message));
      const alarmState = message.values[0].data.alarmState;
      if(alarmState !== "Background" && alarmState !== "Scan") {
        laneStatuses.set(lane.laneData, alarmState);
        // TODO: Pull timeout from config
        setTimeout(() => laneStatuses.set(lane.laneData, "none"), 15000);
      }
    }, [EventType.DATA]);
  }

  useEffect(() => {
    async function connectStreams() {
      if(lanesWithVideo && lanesWithVideo.length > 0) {
        lanesWithVideo.forEach(async (lane) => {

          connectAndSubscribe(lane, lane.gammaDatastream.getSweApi());
          connectAndSubscribe(lane, lane.neutronDatastream.getSweApi());
  
        });
      }
    }

    connectStreams();
  }, [lanesWithVideo]);

  // TODO: Create swe api objects and pass to children

  // DELETE ABOVE ON PRODUCTION

  const maxItems = 6; // Max number of videos per page
  const [page, setPage] = useState(1);  // Page currently selected
  const [startItem, setStartItem] = useState(0);  // Current start of range
  const [endItem, setEndItem] = useState(6); // Current end of range

  // Handle page value change
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    setStartItem(maxItems * (value - 1)); // Set startItem
    setEndItem(maxItems * (value - 1) + maxItems); // Set endItem to offset by maxItems
  };

  return (
    <>
    {lanesWithVideo != null && (
      <Grid container padding={2} justifyContent={"start"}>
        {lanesWithVideo.slice(startItem, endItem).map((lane) => (
          <VideoStatusWrapper key={lane.laneData.id} lane={lane.laneData} status={laneStatuses.get(lane.laneData) ?? "none"} 
          children={<VideoComponent videoDatastreams={lane.videoDatastreams}/>}>
          </VideoStatusWrapper>
        ))}
      <Grid item xs={12} display={"flex"} justifyContent={"center"}>
        <Pagination count={Math.ceil(lanesWithVideo.length / maxItems)} onChange={handleChange} color="primary" showFirstButton showLastButton />
      </Grid>
    </Grid>)}
    </>
  );
}