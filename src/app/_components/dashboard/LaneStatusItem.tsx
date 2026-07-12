"use client";

import Paper from '@mui/material/Paper';
import {Box, Stack, Tooltip, Typography} from '@mui/material';
import TamperIcon from '@mui/icons-material/ReportProblem';
import FaultIcon from '@mui/icons-material/Error';
import HeartIcon from '@mui/icons-material/Favorite';
import CommFailureIcon from '@mui/icons-material/Close';
import GammaAlarmIcon from '@mui/icons-material/Flare';
import NeutronAlarmIcon from '@mui/icons-material/BubbleChart';
import ScanIcon from '@mui/icons-material/Visibility';
import React, {useEffect, useState} from "react";

const HEARTBEAT_KF = {
    '@keyframes heartbeat': {
        '0%':   { transform: 'scale(1)' },
        '20%':  { transform: 'scale(1.5)' },
        '40%':  { transform: 'scale(1.1)' },
        '60%':  { transform: 'scale(1.35)' },
        '80%':  { transform: 'scale(1)' },
        '100%': { transform: 'scale(1)' },
    },
};

export default function LaneStatusItem(props: {
    id: number | string;
    name: string;
    parentNode: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;
    isGammaAlarm: boolean;
    isNeutronAlarm: boolean;
    isScanning: boolean;
    pulseCount: number;
}) {
    const [animKey, setAnimKey] = useState(0);

    // Only animate the icon when in a normal online state (heart or eye)
    const shouldAnimate = props.isOnline && !props.isTamper && !props.isGammaAlarm && !props.isNeutronAlarm && !props.isFault;

    useEffect(() => {
        if (props.pulseCount > 0 && shouldAnimate) {
            setAnimKey(k => k + 1);
        }
    }, [props.pulseCount]);

    const bgColor = props.isTamper ? "secondaryHighlight"
        : props.isGammaAlarm ? "errorHighlight"
        : props.isNeutronAlarm ? "infoHighlight"
        : props.isFault ? "faultHighlight"
        : "inherit";

    // Priority-ordered status: determines the single icon shown
    const getStatus = (): { icon: React.ReactNode; tooltip: string } => {
        if (!props.isOnline)
            return { icon: <CommFailureIcon fontSize="small" color="error" />, tooltip: 'Comm Failure' };
        if (props.isTamper)
            return { icon: <TamperIcon fontSize="small" sx={{ color: '#FFFFFF' }} />, tooltip: 'Tamper' };
        if (props.isGammaAlarm)
            return { icon: <GammaAlarmIcon fontSize="small" color="error" />, tooltip: 'Gamma Alarm' };
        if (props.isNeutronAlarm)
            return { icon: <NeutronAlarmIcon fontSize="small" color="info" />, tooltip: 'Neutron Alarm' };
        if (props.isFault)
            return { icon: <FaultIcon fontSize="small" sx={{ color: 'warning.main' }} />, tooltip: 'Fault' };
        if (props.isScanning)
            return { icon: <ScanIcon fontSize="small" sx={{ color: 'success.main' }} />, tooltip: 'Scan in Progress' };
        return { icon: <HeartIcon fontSize="small" sx={{ color: 'success.main' }} />, tooltip: 'Online' };
    };

    const { icon, tooltip } = getStatus();

    return (
        <Paper key={props.id} variant='outlined'
               sx={{ cursor: 'pointer',
                   padding: 1,
                   height: 25,
                   display: 'flex',
                   alignItems: 'center',
                   backgroundColor: bgColor
               }}
        >
            <Tooltip title={`${props.parentNode} - ${props.name}`} arrow placement="bottom">
                <Stack direction={"row"} spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%'}}>
                    <Typography variant="body1" style={{ fontSize: 12, textWrap: 'nowrap' }}>
                        {props.name.length <= 15 ? props.name : props.name.substr(0, 15)}
                    </Typography>
                    <Tooltip title={tooltip} arrow placement="top">
                        <Box
                            key={shouldAnimate ? animKey : 0}
                            component="span"
                            sx={{
                                display: 'inline-flex',
                                animation: shouldAnimate ? 'heartbeat 0.6s ease-in-out' : 'none',
                                ...HEARTBEAT_KF,
                            }}
                        >
                            {icon}
                        </Box>
                    </Tooltip>
                </Stack>
            </Tooltip>
        </Paper>
    );
}
