"use client";


import Paper from '@mui/material/Paper';
import {Stack, Tooltip, Typography} from '@mui/material';
import AlarmIcon from '@mui/icons-material/NotificationsActive';
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
                   justifyContent: 'left',
                   display: 'flex',
                   alignItems: 'center',

                   backgroundColor: (props.isTamper ? "secondaryHighlight" : props.isFault ? "info" : "inherit")}}
        >
            <Tooltip title={props.name}>
                <Stack direction={"row"} spacing={1}>

                    <Typography variant="body1" style={{fontSize: 12, textWrap: 'nowrap'}}>{props.name.length <= 11 ? props.name : (props.name.substr(0, 11)) }</Typography>

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

                    {!props.isTamper && !props.isFault && props.isOnline && (
                        <Tooltip title={'All Clear'} arrow placement="top">
                            <CheckCircleIcon fontSize="small" color="success"/>
                        </Tooltip>
                    )}

                    {!props.isOnline &&
                        <Tooltip title={'Offline'} arrow placement="top">
                            <OfflineIcon fontSize="small" color="error"/>
                        </Tooltip>
                    }

                </Stack>
            </Tooltip>

        </Paper>

    );
}