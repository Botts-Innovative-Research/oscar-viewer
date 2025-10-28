/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Stack,
} from "@mui/material";

import Divider from "@mui/material/Divider";

import LoadStateForm from "@/app/_components/state-manager/LoadStateForm";
import SaveConfigForm from "@/app/_components/state-manager/SaveConfigForm";

export default function StateManager() {
    return (
        <Box sx={{margin: 2, padding: 2}}>
            <Card>
                <CardHeader title={"Configuration Management"} titleTypographyProps={{variant: "h4"}}/>
                <CardContent component="form">
                    <Box>
                        <Stack spacing={3} divider={<Divider orientation={"horizontal"} flexItem/>} direction="column">
                            {/*<SaveConfigForm />*/}

                            {/*<LoadStateForm />*/}
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

