
import { LaneMeta } from "@/lib/data/oscar/LaneCollection";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import { PropsWithChildren, useEffect, useState } from "react";

interface VideoStatusWrapperProps {
    lane: LaneMeta
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
          <Typography variant="body2">{props.lane.name}</Typography>
        </Grid>
    )
}