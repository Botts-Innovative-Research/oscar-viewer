"use client";


import Paper from '@mui/material/Paper';
import {Stack, Typography} from '@mui/material';
import {useLanguage} from '@/app/contexts/LanguageContext';

export default function DailyFileItem(props: {
    id: number;
    name: string;
    message: string;
}) {
    const {t} = useLanguage();

    return (
        <Paper
            key={props.id}
            variant='outlined'
            color='#fff'
            sx={{
                cursor: 'pointer',
                padding: 1
            }}
        >
            <Stack direction={"row"} justifyContent={"left"} alignItems={"center"}>
                <Typography
                    variant="h6"
                >
                    Message: {props.message}
                </Typography>
            </Stack>
        </Paper>
    );
}
