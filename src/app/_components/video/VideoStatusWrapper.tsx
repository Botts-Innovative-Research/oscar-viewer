import { Protocols } from "@/lib/data/Constants";
import { LaneMeta } from "@/lib/data/oscar/LaneCollection";
import { Datastream } from "@/lib/data/osh/Datastreams";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
import {Mode} from 'osh-js/source/core/datasource/Mode';
import { PropsWithChildren, useEffect, useState } from "react";
import {EventType} from 'osh-js/source/core/event/EventType';

interface VideoStatusWrapperProps {
    lane: LaneMeta
    gammaDatastream: Datastream
    neutronDatastream: Datastream
}

export default function VideoStatusWrapper(props: PropsWithChildren<VideoStatusWrapperProps>) {
    // TODO: Update status for videostream border
    const [status, setStatus] = useState<string>("none");
    const [gammaDatasource, setGammaDatasource] = useState(null);
    const [neutronDatasource, setNeutronDatasource] = useState(null);

    useEffect(() => {
      // Generate SweApi object, layer, and video view and show it below

      // const source = props.datastream.generateSweApiObj({start: START_TIME, end: FUTURE_END_TIME});
      if(gammaDatasource == null){
        const gammaSource = new SweApi(props.gammaDatastream.name, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${props.gammaDatastream.id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
        });
        gammaSource.connect();
        setGammaDatasource(gammaSource);
      }
      
      if(neutronDatasource == null){
        const neutronSource = new SweApi(props.neutronDatastream.name, {
            protocol: Protocols.WS,
            endpointUrl: `162.238.96.81:8781/sensorhub/api`,
            resource: `/datastreams/${props.neutronDatastream.id}/observations`,
            mode: Mode.REAL_TIME,
            tls: false,
            connectorOpts: {
                username: 'admin',
                password: 'admin',
            }
        });
        neutronSource.connect();
        setNeutronDatasource(neutronSource);
      }
  }, []);

  useEffect(() => {

    if(gammaDatasource !== null) {
      gammaDatasource.subscribe((message: any) => {
        const alarmState = message.values[0].data.alarmState;
        if(alarmState !== "Background" && alarmState !== "Scan") {
          console.log(alarmState);
          setStatus(alarmState);
          setTimeout(() => setStatus("none"), 10000);
        }
      }, [EventType.DATA]);
    }

    if(neutronDatasource !== null) {
      neutronDatasource.subscribe((message: any) => {
          const alarmState = message.values[0].data.alarmState; 
          if(alarmState !== "Background" && alarmState !== "Scan") {
            console.log(alarmState);
            setStatus(alarmState);
            setTimeout(() => setStatus("none"), 10000);
          }
      }, [EventType.DATA]);
    }

  }, [gammaDatasource, neutronDatasource]); 

    return (
        <Grid item xs={2} display={"flex"} direction={"column"} alignItems={"center"}
          sx={{
            "&.MuiGrid-item": 
              {...status != "none" ? {
                border: "solid",
                borderWidth: "2px",
                borderColor: (status == "Alarm" ? "error.main" : "secondary.main"),
                backgroundColor: (status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
              } : {},
              padding: "0px",
            },
          }}
        >
          {props.children}
          <Typography variant="body2">{props.lane.name}</Typography>
        </Grid>
    )
}