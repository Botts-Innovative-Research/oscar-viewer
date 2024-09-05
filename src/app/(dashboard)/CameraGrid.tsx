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
  videoSources: typeof SweApi[],
  status: string,
}

/* TODO
If lane has multiple videostreams, just use one or 
implement ability to switch between videostreams
*/
export default function CameraGrid() {
  const dss: Datastream[] = Array.from(useSelector((state: RootState) => state.oshSlice.dataStreams.values()));
  // dss[0].addDatasourceID
  const lanes: LaneMeta[] = useSelector(selectLanes);
  const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);
  let allDatasources = [];


  // Create and connect videostreams
  useEffect(() => {
    if(videoList == null || videoList.length == 0 && dss.length > 0) {
      let videos: LaneWithVideo[] = []

      lanes.map((lane) => {
        console.log(lane)
        const videoDatastreams = dss.filter((ds) => (lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Video") && ds.name.includes("Lane")));

        let sources: typeof SweApi[] = [];
        videoDatastreams.forEach((stream) => {
          const source = new SweApi(stream.id, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${stream.id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            responseFormat: 'application/swe+binary',
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
          });
          source.connect();
          sources.push(source);
        });

        const laneWithVideo: LaneWithVideo = {
          laneData: lane,
          videoSources: sources,
          status: 'none',
        };

        videos.push(laneWithVideo);
      });

      console.log(videos);
      setVideoList(videos);
    }
  }, [dss]);

  // Create and connect alarm statuses
  useEffect(() => {
    if(videoList && videoList.length > 0 && dss.length > 0) {
      lanes.map((lane) => {
        const gammaDatastream = dss.filter((ds) => (lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Gamma") && ds.name.includes("Count")))[0];
        const neutronDatastream = dss.filter((ds)=>(lane.systemIds.includes(ds.parentSystemId) && ds.name.includes("Neutron") && ds.name.includes("Count")))[0];

        // Connect datasources
        console.log(`SweApi from state:`)
        console.log(gammaDatastream.getSweApi())
        
        // const gammaSource = new SweApi(gammaDatastream.id, {
        //   protocol: Protocols.WS,
        //   endpointUrl: `162.238.96.81:8781/sensorhub/api`,
        //   resource: `/datastreams/${gammaDatastream.id}/observations`,
        //   mode: Mode.REAL_TIME,
        //   tls: false,
        //   connectorOpts: {
        //       username: 'admin',
        //       password: 'admin',
        //   }
        // });
        gammaDatastream.getSweApi().connect();
        // console.log(`SweApi created locally:`)
        // console.log(gammaSource)
        // allDatasources.push(gammaSource);

        // const neutronSource = new SweApi(neutronDatastream.id, {
        //   protocol: Protocols.WS,
        //   endpointUrl: `162.238.96.81:8781/sensorhub/api`,
        //   resource: `/datastreams/${neutronDatastream.id}/observations`,
        //   mode: Mode.REAL_TIME,
        //   tls: false,
        //   connectorOpts: {
        //       username: 'admin',
        //       password: 'admin',
        //   }
        // });
        neutronDatastream.getSweApi().connect();
        // allDatasources.push(neutronSource);

        // Subscribe datasources
        gammaDatastream.getSweApi().subscribe((message: any) => {
          const alarmState = message.values[0].data.alarmState;
          console.log(`Gamma state received from ${lane.name}: ${alarmState}`);
          if(alarmState != "Background" && alarmState != "Scan") {
            updateVideoList(lane.id, alarmState);
          }
        }, [EventType.DATA]);

        neutronDatastream.getSweApi().subscribe((message: any) => {
          const alarmState = message.values[0].data.alarmState;
          console.log(`Neutron state received from ${lane.name}: ${alarmState}`);
          if(alarmState != "Background" && alarmState != "Scan") {
            updateVideoList(lane.id, alarmState);
          }
        }, [EventType.DATA]);

      });
    }
  }, [videoList]);

  const updateVideoList = (id: string, newStatus: string) => {
    setVideoList((prevList) => {
      const updatedList = prevList.map((videoData) => 
        videoData.laneData.id === id ? {...videoData, status: newStatus } : videoData
      );

      const updatedVideo = updatedList.find((videoData) => videoData.laneData.id === id);

      if(newStatus !== 'Background' && newStatus !== 'Scan') {
        // Get timeout from config
        setTimeout(() => updateVideoList(id, "none"), 10000);
        const filteredVideos = updatedList.filter((videoData) => videoData.laneData.id !== id);
        return [updatedVideo, ...filteredVideos];
      }

      return updatedList;
    })
  };

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
    {videoList != null && (
      <Grid container padding={2} justifyContent={"start"}>
        {videoList.slice(startItem, endItem).map((lane) => (
          <VideoStatusWrapper key={lane.laneData.id} lane={lane.laneData} status={lane.status} 
          children={<VideoComponent id={lane.laneData.id} videoSources={lane.videoSources}/>}>
          </VideoStatusWrapper>
        ))}
      <Grid item xs={12} display={"flex"} justifyContent={"center"}>
        <Pagination count={Math.ceil(videoList.length / maxItems)} onChange={handleChange} color="primary" showFirstButton showLastButton />
      </Grid>
    </Grid>)}
    </>
  );
}