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
  const [videoStreams, setVideoStreams] = useState<Datastream[] | null>(null);
  const [lanesWithVideo, setLanesWithVideo] = useState<LaneWithVideo[] | null>(null);

  useEffect(() => {
    // console.error("Populating lane datastreams");
    if(lanesWithVideo == null || lanesWithVideo.length == 0 && dss.length > 0) {
      // console.error("Inside population block ")
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
        laneData.push(laneWithVideo);
        console.log("Lane with video:")
        console.log(dss)
        console.log(laneWithVideo);
      });
      // console.error("Lanes POP");
      console.error(laneData);
      setLanesWithVideo(laneData);
    }

    if(videoStreams == null || videoStreams.length == 0) {
      const videos = dss.filter((ds) => {
        console.error(ds.name);
        return ds.name.includes("Video") && ds.name.includes("Lane");
      });
      // console.error("# of videostreams " + videos.length);
      setVideoStreams(videos);
      // console.error("Current videostreams " + videos);
    }
  }, [dss]);

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

  // Images for demo camera grid
  // const demoImages = [
  //   {src: "/FrontGateLeft.png", name: "Front Gate Left", status: "alarm", id: 1},
  //   {src: "/FrontGateRight.png", name: "Front Gate Right", status: "fault", id: 2},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 3},
  //   {src: "/FerryPOVEntry.png", name: "Ferry POV Entry", status: "none", id: 4},
  //   {src: "/RearGateLeft.png", name: "Rear Gate Left", status: "none", id: 5},
  //   {src: "/RearGateRight.png", name: "Rear Gate Right", status: "none", id: 6},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 7},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 8},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 9},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 10},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 11},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
  //   {src: "/FerryPOVExit.png", name: "Ferry POV Exit", status: "none", id: 12},
  // ]

  return (
    <>
    {lanesWithVideo != null && (
      <Grid container padding={2} justifyContent={"start"}>
        {lanesWithVideo.slice(startItem, endItem).map((lane) => (
          <VideoStatusWrapper lane={lane.laneData} gammaDatastream={lane.gammaDatastream} neutronDatastream={lane.neutronDatastream}>
            <VideoComponent videoDatastreams={lane.videoDatastreams}/>
          </VideoStatusWrapper>
        ))}
      <Grid item xs={12} display={"flex"} justifyContent={"center"}>
        <Pagination count={Math.ceil(lanesWithVideo.length / maxItems)} onChange={handleChange} color="primary" showFirstButton showLastButton />
      </Grid>
    </Grid>)}
    </>
  );
}