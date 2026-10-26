"use client";


import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {Stack, Typography} from '@mui/material';
import {useLanguage} from '@/app/contexts/LanguageContext';

export default function LaneItem(props: {
    id: number;
    name: string;
    status: string;
}) {
    const {t} = useLanguage();
    const statusKey = props.status.toLowerCase().replace(/[ -]/g, '');

    if (props.status.toLowerCase() === "none")
        return (<></>)

    const status = props.status === 'Alarm' ? 'alarm'
        : props.status === 'Tamper' || props.status === 'Tamper Off' ? 'tamper'
            : props.status === 'Background' ? 'background'
                : props.status === 'Scan' ? "scan"
                    : props.status.startsWith('Fault') ? 'fault' 
                        : props.status === 'Offline' ? 'offline' : 'online';
    return (
        <Paper
            key={props.id}
            variant='outlined'
            sx={(theme) => {
                const statusColor = theme.palette.status[status];

                return {
                    cursor: 'pointer',
                    p: 1,
                    borderColor: statusColor.main,
                    backgroundColor: statusColor.container,
                    color: statusColor.onContainer,
                };
            }}
        >
            <Stack direction={"row"} justifyContent={"left"} alignItems={"center"}>
                <CircleRoundedIcon fontSize="large"
                    sx={(theme) => ({
                        color: theme.palette.status[status].main,
                        mr: 2,
                    })} />
                <Typography
                    variant="h6"
                    sx={(theme) => ({color: theme.palette.status[status].onContainer})}
                >
                    {t('laneStatusValue', {lane: props.name, status: t(`status.${statusKey}`)})}
                </Typography>
            </Stack>
        </Paper>
    );
}
