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
  const [lanesWithVideo, setLanesWithVideo] = useState<LaneWithVideo[] | null>(null);

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

        laneData.push(laneWithVideo);
      });

      console.log(laneData);
      setLanesWithVideo(laneData);
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

  return (
    <>
    {lanesWithVideo != null && (
      <Grid container padding={2} justifyContent={"start"}>
        {lanesWithVideo.slice(startItem, endItem).map((lane) => (
          <VideoStatusWrapper key={lane.laneData.id} lane={lane.laneData} gammaDatastream={lane.gammaDatastream} neutronDatastream={lane.neutronDatastream} 
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