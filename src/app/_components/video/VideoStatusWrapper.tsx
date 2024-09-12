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
    laneName: string
    status: string
}

export default function VideoStatusWrapper(props: PropsWithChildren<VideoStatusWrapperProps>) {

    return (
        <Grid item xs={2} display={"flex"} direction={"column"} alignItems={"center"}
          sx={{
            "&.MuiGrid-item": 
              {...props.status != "none" ? {
                border: "solid",
                borderWidth: "2px",
                borderColor: (props.status == "Alarm" ? "error.main" : "secondary.main"),
                backgroundColor: (props.status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
              } : {},
              padding: "0px",
            },
          }}
        >
          {props.children}
          <Typography variant="body2">{props.laneName}</Typography>
        </Grid>
    )
}