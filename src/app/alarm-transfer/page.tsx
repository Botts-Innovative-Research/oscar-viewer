"use client";

import React from "react";
import {Grid, Paper, Typography} from "@mui/material";
import AlarmTransferImport from "@/app/_components/alarm-transfer/AlarmTransferImport";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function AlarmTransferPage() {
    const {t} = useLanguage();
    return (
        <Grid container spacing={2} width="100%">
            <Grid item xs={12}><Typography variant="h4">{t("alarmTransfer")}</Typography></Grid>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{p: 2}}><AlarmTransferImport/></Paper>
            </Grid>
        </Grid>
    );
}
