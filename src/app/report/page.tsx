"use client"

import {
    Box,
    Grid,
    Paper,
    Typography
} from "@mui/material"
import React from "react";
import Report from "@/app/_components/reportgen/Report";
import {useLanguage} from "@/contexts/LanguageContext";

export default function ReportViewPage() {
    const { t } = useLanguage();

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12}>
                <Typography variant="h4">
                    { t('reportGenerator') }
                </Typography>
            </Grid>
            <Grid item xs={12} width={"100%"} minWidth={0}>
                <Report/>
            </Grid>
        </Grid>
    )
}