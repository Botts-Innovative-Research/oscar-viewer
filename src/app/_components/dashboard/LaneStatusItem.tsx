"use client";


import Paper from '@mui/material/Paper';
import {Stack, Tooltip, Typography} from '@mui/material';
import TamperIcon from '@mui/icons-material/ReportProblem';
import FaultIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OfflineIcon from '@mui/icons-material/ReportOff'
import React from "react";


export default function LaneStatusItem(props: {
    id: number;
    name: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;

}) {

    return (
        <Paper key={props.id} variant='outlined'
               sx={{ cursor: 'pointer',
                   padding: 1,
                   height: 25,
                   display: 'flex',
                   alignItems: 'center',
                   backgroundColor: (props.isTamper ? "secondaryHighlight" : props.isFault ? "info" : "inherit")
               }}
        >
            <Tooltip title={props.name} arrow placement="bottom">
                <Stack direction={"row"} spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-start', width: '100%'}}>

                    <Typography variant="body1" style={{fontSize: 12, textWrap: 'nowrap',  }}>{props.name.length <= 15 ? props.name : (props.name.substr(0, 15)) }</Typography>

                    {props.isFault &&
                        <Tooltip title={'Fault'} arrow placement="top">
                            <FaultIcon fontSize="small" color="info" />
                        </Tooltip>
                    }

                    {props.isTamper &&
                        <Tooltip title={'Tamper'} arrow placement="top">
                            <TamperIcon fontSize="small" sx={{color: "#FFFFFF" }}/>
                        </Tooltip>
                    }
                    {/*{!props.isTamper && !props.isFault && props.isOnline && (*/}
                    {props.isOnline ? (
                        <Tooltip title="Online" arrow placement="top">
                            <CheckCircleIcon fontSize="small" color="success"/>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Offline" arrow placement="top">
                            <OfflineIcon fontSize="small" color="error"/>
                        </Tooltip>
                    )}

                </Stack>
            </Tooltip>

        </Paper>

    );
}