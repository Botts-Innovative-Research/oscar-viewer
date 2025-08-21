"use client"

import {Button, Container, Snackbar, SnackbarCloseReason, SnackbarContent, Stack, TextField, Typography} from "@mui/material"
import React, {useState} from "react";
import {setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";

export default function AccountViewPage() {
    const dispatch = useAppDispatch();

    const [appUserName, setAppUserName] = useState<string>("");
    const router = useRouter();
    const [openSnack, setOpenSnack] = useState(false);
    const[volumeSnackMsg, setVolumeSnackMsg] = useState("Alarms will trigger audible sound in client. Be cautious of volume levels.");

    const onChangeUserName = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = event.target;
        setAppUserName(value);
        dispatch(setCurrentUser(value));
    }

    const onClickLogin = () => {
        setOpenSnack(true)
        dispatch(setCurrentUser(appUserName));
        console.log("User updated:", appUserName);
        router.push('/dashboard');
    }

    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };


    return (
        <Container sx={{width: "40%"}}>
            <Stack spacing={2} alignItems={"center"}>
                <TextField
                    data-testid="username-input"
                    autoComplete="new-username"
                    fullWidth
                    id="username"
                    placeholder="Username"
                    variant="outlined"
                    onChange={onChangeUserName}
                />

                <TextField
                    data-testid="password-input"
                    autoComplete="new-password"
                    fullWidth
                    id="password"
                    placeholder="Password"
                    variant="outlined"
                    type="password"
                />

                <Button
                    data-testid="login-button"
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={onClickLogin}
                >
                    Login
                </Button>

                <Snackbar
                    open={openSnack}
                    anchorOrigin={{ vertical:'top', horizontal:'center' }}
                    autoHideDuration={5000}
                    onClose={handleCloseSnack}
                >
                    <SnackbarContent
                        data-testid="volume-snackbar"
                        style={{
                            backgroundColor: '#f8aa51',
                            color: '#ffffff'
                        }}
                        message={volumeSnackMsg}
                    />
                </Snackbar>

            </Stack>
        </Container>
    )
}
