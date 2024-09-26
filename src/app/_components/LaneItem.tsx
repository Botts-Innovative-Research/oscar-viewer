"use client";


import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {capitalize, Stack, Typography} from '@mui/material';

export default function LaneItem(props: {
    id: number;
    name: string;
    status: string;
}) {
    if (props.status == "none")
        return (<></>)
    return (
        <Paper key={props.id} variant='outlined' sx={{ cursor: 'pointer', padding: 1,
            backgroundColor: (
                props.status == "Alarm" ? "errorHighlight"
                    : props.status == 'Tamper' ? "secondaryHighlight"
                        : props.status === ('Fault - Gamma Low') ? 'infoHighlight'
                            : props.status === ('Fault - Neutron Low') ? 'infoHighlight'
                                : props.status === ('Fault - Gamma High') ? 'infoHighlight'
                                    : props.status === 'Scan' || props.status === 'Background' ? 'successHighlight'
                                        : 'unknown'
            )
        }}
        >
            <Stack direction={"row"}>
                <CircleRoundedIcon
                    color={(
                        props.status === "Alarm" ? "error"
                            : props.status === 'Tamper' ? "secondary"
                                : props.status ==='Fault - Gamma Low' ? 'info'
                                    : props.status === 'Fault - Gamma High' ? 'info'
                                        : props.status === 'Fault - Neutron Low' ? 'info'
                                            : props.status === 'Scan' || props.status === 'Background' ? 'success'
                                                : 'success'
                    )
                    }
                    sx={{ marginRight: 2 }} />
                <Typography variant="body1">{props.name} - {capitalize(props.status)}</Typography>
            </Stack>
        </Paper>
    );
}