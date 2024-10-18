
import { LaneMeta } from "@/lib/data/oscar/LaneCollection";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import React, { PropsWithChildren, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Link from "next/link";
import LaneStatusItem from "@/app/_components/dashboard/LaneStatusItem";

interface VideoStatusWrapperProps {
    laneName: string
    status: string
}

export default function VideoStatusWrapper(props: PropsWithChildren<VideoStatusWrapperProps>) {

    return (
        <Grid item xs={3} spacing={0}>
            <Grid container direction={"column"} spacing={0}>
                <Grid item xs={12} display={"flex"} direction={"column"} alignItems={"center"}
                      sx={{
                          "&.MuiGrid-item":
                              {...props.status != "none" ? {
                                      border: "solid",
                                      borderWidth: "2px",
                                      borderColor: (props.status == "Alarm" ? "error.main" : "Tamper" ? "secondary.main" : '#b7b7b7'),
                                      backgroundColor: (props.status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
                                  } : {},
                                  padding: "0px",
                              },
                      }}
                >
                    {props.children}
                </Grid>
                <Grid item xs={12}  display={"flex"} direction={"column"} alignItems={"center"}>
                    <Link href={{pathname: '/lane-view', query: {name: props.laneName}}} passHref>
                        <Button type="button" sx={{color: (props.status === "Alarm" ? "error.main" : props.status === "Tamper" ? "secondary.main" : '#000000')}}>{props.laneName}</Button>
                    </Link>
                </Grid>
            </Grid>
        </Grid>


    )
}