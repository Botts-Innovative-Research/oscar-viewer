"use client";


import Paper from '@mui/material/Paper';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import {capitalize, Stack, Typography} from '@mui/material';

export default function LaneItem(props: {
    id: number;
    name: string;
    status: string;
}) {

    const colors = (status: string) => {

        if (status === 'Scan' || status === 'Background')
            return ('#000');
        else if( status === 'Alarm' || status === 'Tamper')
            return ('#FFFFFF');

    };


    if (props.status == "none")
        return (<></>)
    return (
        <Paper key={props.id} variant='outlined' color='#fff' sx={{ cursor: 'pointer', padding: 1,
            backgroundColor: (
                props.status == "Alarm" ? "errorHighlight"
                    : props.status == 'Tamper' ? "secondaryHighlight"
                        : props.status === ('Fault - Gamma Low') ? 'infoHighlight'
                            : props.status === ('Fault - Neutron Low') ? 'infoHighlight'
                                : props.status === ('Fault - Gamma High') ? 'infoHighlight'
                                    : props.status === 'Scan' || props.status === 'Background' || props.status==='Online' ? 'successHighlight'
                                        : 'unknown'
            )
        }}
        >
            <Stack direction={"row"} justifyContent={"left"} alignItems={"center"}>
                <CircleRoundedIcon fontSize="large"
                    color={(
                        props.status === "Alarm" ? "error"
                            : props.status === 'Tamper' || props.status === 'Tamper Off' ? "secondary"
                                : props.status ==='Fault - Gamma Low' ? 'info'
                                    : props.status === 'Fault - Gamma High' ? 'info'
                                        : props.status === 'Fault - Neutron Low' ? 'info'
                                            : props.status === 'Scan' || props.status === 'Background' || props.status==='Online' ? 'success'
                                                : 'inherit'
                    )
                    }
                    sx={{ marginRight: 2}} />
                <Typography variant="h6" color={colors(props.status)}>{props.name} - Status: {capitalize(props.status)}</Typography>
            </Stack>
        </Paper>
    );
}