import {Box, Button, Typography } from "@mui/material";
import Grid from "@mui/material/Grid/Grid";
import Link from "next/link";
import { PropsWithChildren} from "react";

interface VideoStatusWrapperProps {
    laneName: string
    status: string
}

export default function VideoStatusWrapper(props: PropsWithChildren<VideoStatusWrapperProps>) {

    return (
            <Grid item xs={2} display={"flex"} direction={"column"} alignItems={"center"} justifyContent={"center"} padding={1}
                  sx={{
                      "&.MuiGrid-item":
                          {...props.status !== "none" ? {
                                  // Styling for alarm and tamper states
                                  border: "solid",
                                  borderWidth: "1px",
                                  borderColor: (props.status == "Alarm" ? "error.main" : "secondary.main"),
                                  backgroundColor: (props.status == "Alarm" ? "errorHighlight" : "secondaryHighlight"),
                              } : {

                                  border: "solid",
                                  borderWidth: "1px",
                                  borderColor:  "rgba(0, 0, 0, 0.12)",
                              },
                              margin: "0px 0px 4px 0px",
                          },
                  }}
            >
                {props.children}

                <Link href={{pathname: '/lane-view', query: {name: props.laneName}}} passHref>
                    <Typography variant="body2" style={{fontSize: 12, textWrap: 'nowrap'}}>{props.laneName}</Typography>
                </Link>
            </Grid>

    )
}
