"use client"

import {Button, Container, Stack, TextField, Typography} from "@mui/material"
import {useState} from "react";
import {setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/navigation";

export default function AccountViewPage() {
    const [appUserName, setAppUserName] = useState<string>("");
    const dispatch = useAppDispatch();
    const router = useRouter();

    const onChangeUserName = (event: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = event.target;
        setAppUserName(value);
    }

    const onClickLogin = () => {
        dispatch(setCurrentUser(appUserName));
        console.log("User updated:", appUserName);
        router.push('/dashboard');
    }


    return (
        <Container sx={{width: "40%"}}>
            <Stack spacing={2} alignItems={"center"}>
                <Typography variant="h4">Login</Typography>
                <TextField fullWidth id="username" label="Username" variant="outlined" onChange={onChangeUserName}/>
                <TextField fullWidth id="password" label="Password" variant="outlined" type="password"/>
                <Button fullWidth variant="contained" color="success" onClick={onClickLogin}>Login</Button>
            </Stack>
        </Container>
    )
}
