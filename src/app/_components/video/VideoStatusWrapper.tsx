import {Box, Button, Tooltip, Typography} from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import Link from "next/link";
import React, { PropsWithChildren} from "react";

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
                                  borderWidth: "1px",
                                  borderColor: (props.status == "Alarm" ? "error.main" : "secondary.main"),
                                  backgroundColor: (props.status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
                              } : {
                                  // Styling for t>mper state
                                  border: "solid",
                                  borderWidth: "1px",
                                  borderColor: "rgba(0, 0, 0, 0.12)",
                                  borderRadius: "10px"
                              },
                              margin: "2px",
                          },
                  }}
            >
                {props.children}
                <Typography variant="body1" style={{fontSize: 12, textWrap: 'nowrap'}}>{props.laneName}</Typography>
            </Grid>

    )
}


{/*<Link href={{pathname: '/lane-view', query: {name: props.laneName}}} passHref>*/}
{/*<Tooltip title={props.laneName} arrow placement="bottom">*/}
{/*    <Typography variant="body2" style={{textWrap: 'nowrap'}}>{props.laneName.length <= 10 ? props.laneName : (props.laneName.substr(0, 10)) }</Typography>*/}
{/*</Tooltip>*/}
{/*</Link>*/}