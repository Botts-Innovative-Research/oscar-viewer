"use client";

import {Grid, Pagination} from '@mui/material';
import {useCallback, useContext, useEffect, useRef, useState} from 'react';
import "../../style/cameragrid.css";
import {useSelector} from 'react-redux';
import {LaneDSColl, LaneMapEntry, LaneMeta} from '@/lib/data/oscar/LaneCollection';
import VideoComponent from '../video/VideoComponent';
import {selectLaneMap, selectLanes} from '@/lib/state/OSCARClientSlice';
import {RootState} from '@/lib/state/Store';
import VideoStatusWrapper from '../video/VideoStatusWrapper';
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import VideoCarousel from "@/app/_components/video/VideoCarousel";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";


interface LaneWithVideo {
  laneName: string,
  videoSources: typeof SweApi[],
  status: string,
}


export default function CameraGrid() {

  const [videoList, setVideoList] = useState<LaneWithVideo[]>([]);

  const {laneMapRef} = useContext(DataSourceContext);
  const laneMap = useSelector((state: RootState) => selectLaneMap(state));
  const [dsVideo, setDsVideo] = useState([]);

  const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

  //camera grid pages 6 carousels per page
  const maxItems = 6; // Max number of videos per page
  const [page, setPage] = useState(1);  // Page currently selected
  const [startItem, setStartItem] = useState(0);  // Current start of range
  const [endItem, setEndItem] = useState(maxItems); // Current end of range


  const datasourceSetup = useCallback(async () => {

    let laneDSMap = new Map<string, LaneDSColl>();
    let videoDs: any[] = [];

    for (let [laneid, lane] of laneMap.entries()) {
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
        if(ds.properties.observedProperties[0].definition.includes("http://sensorml.com/ont/swe/property/RasterImage") || ds.properties.observedProperties[0].definition.includes("http://sensorml.com/ont/swe/property/VideoFrame")){
          console.log("Video DS Found",ds);
          videoDs.push(ds);
          laneDSColl.addDS('videoRT', rtDS)
        }
      }
      setDsVideo(videoDs);
      setDataSourcesByLane(laneDSMap);
    }
  }, [laneMapRef.current]);

  useEffect(() => {
    datasourceSetup();
  }, [laneMapRef.current]);

  useEffect(() => {
     if(videoList == null || videoList.length == 0 && laneMap.size > 0 && dsVideo.length > 0) {
       let updatedVideos: LaneWithVideo[] = []

       laneMap.forEach((value, key) => {
         if(laneMap.has(key)) {

           let ds: LaneMapEntry = laneMap.get(key);

           dsVideo.map((dss) => {
             const videoSources = ds.datasourcesRealtime.filter((item) => item.properties.resource === ("/datastreams/" + dss.properties.id + "/observations"));

             if (videoSources.length > 0) {
               //if lane exists add video source to lane else create a new lane
               const existingLane = updatedVideos.find((lane)=> lane.laneName === key);

               if(existingLane){
                 existingLane.videoSources.push(...videoSources.filter((source) => !existingLane.videoSources.some((existingSource) => existingSource === source)));
               }else{
                 const laneWithVideo: LaneWithVideo = {
                   laneName: key,
                   videoSources: videoSources,
                   status: 'none',
                 };
                 updatedVideos.push(laneWithVideo);
               }
             }
           });
         }
       })
       setVideoList(updatedVideos);
     }
   }, [laneMap, dsVideo]);

  // useEffect(() => {
  //
  //   if (videoList == null || videoList.length == 0 && laneMap.size > 0) {
  //     let videos: LaneWithVideo[] = []
  //
  //     laneMap.forEach((value, key) => {
  //       let ds: LaneMapEntry = value;
  //
  //       const videoSources = ds.datasourcesRealtime.filter((item) => item.name.includes('Video') && item.name.includes('Lane'));
  //
  //       if (videoSources.length > 0) {
  //         const existingLane = videos.find((lane)=> lane.laneName === key);
  //         if(existingLane){
  //           existingLane.videoSources.push(...videoSources);
  //         }else{
  //           const laneWithVideo: LaneWithVideo = {
  //             laneName: key,
  //             videoSources: videoSources,
  //             status: 'none',
  //           };
  //           videos.push(laneWithVideo);
  //         }
  //
  //
  //       }
  //     });
  //
  //     console.log("CamGrid - Videos", videos);
  //     setVideoList(videos);
  //   }
  // }, [laneMap]);




  const addSubscriptionCallbacks = useCallback(() => {
    console.log('callback called')
    for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {

      // guard against a lane where there is no video source, so we can avoid an error popup
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
        const alarmState = message.values[0].data.tamperStatus;
        if (alarmState) {
          updateVideoList(laneName, 'Tamper');
        }
      });

      laneDSColl.connectAllDS();
    }
  }, [dataSourcesByLane, videoList]);


  useEffect(() => {
    // if (videoList !== null && videoList.length > 0) {
      addSubscriptionCallbacks();
    // }
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


  // Handle camera grid pages
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    setStartItem(maxItems * (value - 1)); // Set startItem
    setEndItem(maxItems * (value - 1) + maxItems); // Set endItem to offset by maxItems
  };


  return (
      <>
        {videoList != null && (
            <Grid container padding={2} justifyContent={"start"} spacing={1}>

              {videoList.slice(startItem, endItem).map((lane) => (
                  <VideoStatusWrapper key={lane.laneName} laneName={lane.laneName} status={lane.status}
                                      children={(<VideoCarousel laneName={lane.laneName} videoSources={lane.videoSources}/>)} />
              ))}
              <Grid item xs={12} display={"flex"} justifyContent={"center"}>
                <Pagination count={Math.ceil(videoList.length / maxItems)} onChange={handleChange} color="primary" showFirstButton showLastButton/>
              </Grid>
            </Grid>)}
      </>
  );
}
