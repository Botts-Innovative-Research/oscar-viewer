
import { LaneMeta } from "@/lib/data/oscar/LaneCollection";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import { PropsWithChildren, useEffect, useState } from "react";

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
                // Styling for alarm and tamper states
                border: "solid",
                borderWidth: "2px",
                borderColor: (props.status == "Alarm" ? "error.main" : "secondary.main"),
                backgroundColor: (props.status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
              } : {
                // Styling for tamper state
                border: "solid",
                borderWidth: "2px",
                borderColor: "#bdbdbd",
              },
              margin: "2px",
            },
          }}
        >
          {props.children}
          <Typography variant="body2">{props.laneName}</Typography>
        </Grid>
    )
}