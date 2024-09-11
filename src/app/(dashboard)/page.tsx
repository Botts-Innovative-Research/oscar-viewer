"use client";

import { Grid, Paper } from "@mui/material";
import CameraGrid from "./CameraGrid";
import LaneStatus from "./LaneStatus";

import EventPreview from "./EventPreview";
import {useEffect, useState} from "react";
import {IEventTableData, LaneOccupancyData, LaneStatusData, SelectedEvent} from "types/new-types";
import Table from "../_components/event-table/Table";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {useSelector} from "react-redux";
import {selectLanes} from "@/lib/state/OSCARClientSlice";

export default function DashboardPage() {
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);  // Reference types/new-types.d.ts to change type

  const ds : Datastream[] = Array.from(useSelector((state: any) => state.oshSlice.dataStreams.values()));
  const lanes: LaneMeta[] = useSelector(selectLanes);

  const [laneStatus, setLaneStatus] = useState<LaneStatusData[]| null>(null);
  const [laneOccupancy, setLaneOccupancy] = useState<LaneOccupancyData[]>(null);


  useEffect(() => {
    if (laneStatus === null && ds.length > 0) {
      let statuses: LaneStatusData[] = [];
      let laneOcc: LaneOccupancyData[] = [];

      lanes.map((lane) => {

        const gammaStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Gamma Count'));
        const neutronStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Neutron Count'));
        const tamperStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Tamper'));
        const occStreams = ds.filter((dss) => lane.systemIds.includes(dss.parentSystemId) && dss.name.includes('Driver - Occupancy'));

        const occ: LaneOccupancyData = {
          laneData: lane,
          occupancyStreams: occStreams
        };

        const stat: LaneStatusData = {
          laneData: lane,
          gammaDataStream: gammaStreams,
          neutronDataStream: neutronStreams,
          tamperDataStream: tamperStreams
        };
        statuses.push(stat);
        laneOcc.push(occ);
      });
      setLaneStatus(statuses);
      setLaneOccupancy(laneOcc);
    }
  }, [ds, lanes]);



  // Handle currently selected event in datagrid
  const handleRowSelect = (event: SelectedEvent) => {
    //console.log(event); // Log the selected row data
    setSelectedEvent(event);
  }


  return (
      <Grid container spacing={2} direction={"column"}>
        <Grid item container spacing={2} style={{ flexBasis: '33.33%', flexGrow: 0, flexShrink: 0 }}>
          <Grid item xs={8}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <CameraGrid />
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <LaneStatus laneStatusData={laneStatus}/>
            </Paper>
          </Grid>
        </Grid>
        <Grid item container spacing={2} style={{ flexBasis: '66.66%', flexGrow: 0, flexShrink: 0 }}>
          <Grid item xs={8}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <Table tableMode={"alarmtable"} onRowSelect={handleRowSelect}  />
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper variant='outlined' sx={{ height: "100%" }}>
              <EventPreview event={selectedEvent} />
            </Paper>
          </Grid>
        </Grid>
      </Grid>
  );
}