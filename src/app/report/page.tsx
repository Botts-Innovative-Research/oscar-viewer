"use client"

import {
    Box,
    Paper,
    Typography
} from "@mui/material"
import React from "react";
import Report from "@/app/_components/reportgen/Report";
import {useLanguage} from "@/contexts/LanguageContext";

export default function ReportViewPage() {
    const { t } = useLanguage();

    return (
        <Box sx={{margin: 2, width: '100%', height: "100%", padding: 2}}>
            <Typography variant="h4" sx={{padding: 2}}>
                { t('reportGenerator') }
            </Typography>
            <br />
            <Report/>
        </Box>
    )
}