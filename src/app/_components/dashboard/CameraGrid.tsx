"use client";

import {Grid, Pagination} from '@mui/material';
import {useCallback, useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import {useSelector} from 'react-redux';
import {LaneDSColl, LaneMapEntry, LaneMeta} from '@/lib/data/oscar/LaneCollection';
import VideoComponent from '../video/VideoComponent';
import {selectLaneMap, selectLanes} from '@/lib/state/OSCARClientSlice';
import {RootState} from '@/lib/state/Store';
import VideoStatusWrapper from '../video/VideoStatusWrapper';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import VideoCarousel from "@/app/_components/video/VideoCarousel";


interface LaneWithVideo {
  laneName: string,
  videoSources: typeof SweApi[],
  status: string,
}

/* TODO
If lane has multiple videostreams, just use one or
implement ability to switch between videostreams
*/
export default function CameraGrid() {
  const idVal = useRef(1)
  const [videoList, setVideoList] = useState<LaneWithVideo[]>([]);
  // Create and connect alarm statuses
  const laneMap = useSelector((state: RootState) => selectLaneMap(state));
  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

  // Create and connect videostreams
  useEffect(() => {

    if (videoList == null || videoList.length == 0 && laneMap.size > 0) {
      let videos: LaneWithVideo[] = []

      laneMap.forEach((value, key) => {
        let ds: LaneMapEntry = value;
        const videoSources = ds.datasourcesRealtime.filter((item) => item.name.includes('Video') && item.name.includes('Lane'));

        if (videoSources.length > 0) {
          const laneWithVideo: LaneWithVideo = {
            // Get lane name
            laneName: key,
            // All video sources for the lane
            videoSources: videoSources,
            // Current status of lane
            status: 'none',
          };
          videos.push(laneWithVideo);
        }
      });

      console.log("CamGrid - Videos", videos);
      setVideoList(videos);
    }
  }, [laneMap]);


  const datasourceSetup = useCallback(async () => {

    let laneDSMap = new Map<string, LaneDSColl>();

    for (let [laneid, lane] of laneMap.entries()) {
      laneDSMap.set(laneid, new LaneDSColl());
      for (let ds of lane.datastreams) {

        let idx: number = lane.datastreams.indexOf(ds);
        let rtDS = lane.datasourcesRealtime[idx];
        let laneDSColl = laneDSMap.get(laneid);

        if (ds.properties.name.includes('Driver - Gamma Count')) {
          laneDSColl.addDS('gammaRT', rtDS);
        }

        if (ds.properties.name.includes('Driver - Neutron Count')) {
          laneDSColl.addDS('neutronRT', rtDS);
        }

        if (ds.properties.name.includes('Driver - Tamper')) {
          laneDSColl.addDS('tamperRT', rtDS);
        }

        if (ds.properties.name.includes('Video')) {
          console.log("Video DS Found", ds);
        }
      }
      setDataSourcesByLane(laneDSMap);
    }
  }, [laneMap]);

  useEffect(() => {
    datasourceSetup();
  }, [laneMap]);

  const addSubscriptionCallbacks = useCallback(() => {
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {

      // guard against a lane where there is no video source so we can avoid an error popup
      if (!videoList.some((lane) => lane.laneName === laneName)) {
        continue;
      }

      laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
        const alarmState = message.values[0].data.alarmState;
        if (alarmState != "Background" && alarmState != "Scan") {
          updateVideoList(laneName, alarmState);
        }
      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
        const alarmState = message.values[0].data.alarmState;
        if (alarmState != "Background" && alarmState != "Scan") {
          updateVideoList(laneName, alarmState);
        }
      });
      laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
        const alarmState = message.values[0].data.alarmState;
        if (alarmState != "Background" && alarmState != "Scan") {
          updateVideoList(laneName, alarmState);
        }
      });

      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane]);


  useEffect(() => {
    if (videoList !== null && videoList.length > 0) {
      addSubscriptionCallbacks();
    }
  }, [dataSourcesByLane, videoList]);

  const updateVideoList = (laneName: string, newStatus: string) => {
    setVideoList((prevList) => {
      const updatedList = prevList.map((videoData) =>
          videoData.laneName === laneName ? {...videoData, status: newStatus} : videoData
      );

      const updatedVideo = updatedList.find((videoData) => videoData.laneName === laneName);

      if (newStatus !== 'Background' && newStatus !== 'Scan') {
        // Get timeout from config
        setTimeout(() => updateVideoList(laneName, "none"), 10000);
        const filteredVideos = updatedList.filter((videoData) => videoData.laneName !== laneName);
        return [updatedVideo, ...filteredVideos];
      }

      return updatedList;
    })
  };

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
                  <VideoStatusWrapper key={idVal.current++} laneName={lane.laneName} status={lane.status}>
                    <VideoCarousel laneName={lane.laneName} videoSources={lane.videoSources}/>
                  </VideoStatusWrapper>

              ))}
              <Grid item xs={12} display={"flex"} justifyContent={"center"}>
                <Pagination count={Math.ceil(videoList.length / maxItems)} onChange={handleChange}
                            color="primary" showFirstButton showLastButton/>
              </Grid>
            </Grid>)}
      </>
  );
}
