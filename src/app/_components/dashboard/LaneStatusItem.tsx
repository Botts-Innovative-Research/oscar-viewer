"use client";


import Paper from '@mui/material/Paper';
import {IconButton, Stack, Tooltip, Typography} from '@mui/material';
import TamperIcon from '@mui/icons-material/ReportProblem';
import FaultIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OfflineIcon from '@mui/icons-material/ReportOff'
import ClearIcon from '@mui/icons-material/Clear';
import React from "react";
import {useLanguage} from '@/app/contexts/LanguageContext';


export default function LaneStatusItem(props: {
    id: number;
    name: string;
    parentNode: string;
    isOnline: boolean;
    isTamper: boolean;
    isFault: boolean;
    onClearTamper: (event: React.MouseEvent<HTMLButtonElement>) => void;

}) {
    const {t} = useLanguage();
    const status = props.isTamper
        ? "tamper"
        : props.isFault
            ? "fault"
            : props.isOnline
                ? "online"
                : "offline";
    const hasStatusContainer = status === "tamper" || status === "fault";

    return (
        <Paper key={props.id} variant='outlined'
               sx={(theme) => {
                   const statusColor = theme.palette.status[status];

                   return {
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       height: 25,
                       p: 1,
                       borderColor: hasStatusContainer ? statusColor.main : theme.palette.border.subtle,
                       backgroundColor: hasStatusContainer ? statusColor.container : theme.palette.background.paper,
                       color: hasStatusContainer ? statusColor.onContainer : theme.palette.text.primary,
                   };
               }}
        >
            <Tooltip title={`${props.parentNode}- ${props.name}`} arrow placement="bottom">
                <Stack
                    direction={"row"}
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        width: '100%'
                    }}
                >
                    <Typography variant="body2" noWrap sx={{minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {props.name.length <= 15 ? props.name : (props.name.substr(0, 15))}
                    </Typography>

                    {props.isFault &&
                        <Tooltip title={t('fault')} arrow placement="top">
                            <FaultIcon fontSize="small" sx={(theme) => ({color: theme.palette.status.fault.main})} />
                        </Tooltip>
                    }

                    {props.isTamper &&
                        <>
                            <Tooltip title={t('tamper')} arrow placement="top">
                                <TamperIcon fontSize="small" sx={(theme) => ({color: theme.palette.status.tamper.main})}/>
                            </Tooltip>
                            <Tooltip title={t('clearTamper')} arrow placement="top">
                                <IconButton
                                    aria-label={t('clearTamperForLane', {lane: props.name})}
                                    size="small"
                                    onClick={props.onClearTamper}
                                    sx={(theme) => ({
                                        color: theme.palette.status.tamper.main,
                                        ml: 'auto',
                                        width: 32,
                                        height: 32,
                                    })}
                                >
                                    <ClearIcon fontSize="small"/>
                                </IconButton>
                            </Tooltip>
                        </>
                    }
                    {props.isOnline ? (
                        <Tooltip title={t('online')} arrow placement="top">
                            <CheckCircleIcon fontSize="small" sx={(theme) => ({color: theme.palette.status.online.main})}/>
                        </Tooltip>
                    ) : (
                        <Tooltip title={t('offline')} arrow placement="top">
                            <OfflineIcon fontSize="small" sx={(theme) => ({color: theme.palette.status.offline.main})}/>
                        </Tooltip>
                    )}
                </Stack>
            </Tooltip>
        </Paper>
    );
}
