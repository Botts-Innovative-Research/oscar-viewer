"use client"

import {Button, Container, Snackbar, SnackbarCloseReason, Stack, TextField, Typography} from "@mui/material"
import React, {useState} from "react";

export default function AccountViewPage(){

    //snackbar
    const [loginSnackMsg, setLoginSnackMsg] = useState('');
    const [openSnack, setOpenSnack] = useState(false);

    const handleCloseSnack = (
        event: React.SyntheticEvent | Event,
        reason?: SnackbarCloseReason,
    ) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };

    const handleLogin = () =>{
        setOpenSnack(true);
    }

    return(
        <Container sx={{width: "40%"}}>
            <Stack spacing={2} alignItems={"center"}>
                <Typography variant="h4">Login</Typography>
                <TextField fullWidth id="username" label="Username" variant="outlined" />
                <TextField fullWidth id="password" label="Password" variant="outlined" type="password" />
                <Button fullWidth variant="contained" color="success" onClick={handleLogin}>Login</Button>
                <Snackbar
                    open={openSnack}
                    autoHideDuration={5000}
                    onClose={handleCloseSnack}
                    message={'Login successful.'}
                />
            </Stack>
        </Container>
    )
}
