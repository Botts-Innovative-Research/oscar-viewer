"use client"

import { Button, Container, Stack, TextField, Typography } from "@mui/material"

export default function AccountViewPage(){
    return(
        <Container sx={{width: "40%"}}>
            <Stack spacing={2} alignItems={"center"}>
                <Typography variant="h4">Login</Typography>
                <TextField fullWidth id="username" label="Username" variant="outlined" />
                <TextField fullWidth id="password" label="Password" variant="outlined" type="password" />
                <Button fullWidth variant="contained" color="success">Login</Button>
            </Stack>
        </Container>
    )
}
