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

                <Link href={{pathname: '/lane-view', query: {name: props.laneName}}} passHref>
                    <Button size="small" sx={{color:'#000000', fontSize: {xs: "0.75rem", sm: "0.85rem", md: "0.9rem", lg: "1rem"} }}>{props.laneName}</Button>
                </Link>
            </Grid>

    )
}