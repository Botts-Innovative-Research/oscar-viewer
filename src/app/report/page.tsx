"use client"

import {
    Box,
    Paper,
    Typography
} from "@mui/material"
import React from "react";
import ReportGenerator from "@/app/_components/reportgen/ReportGenerator";

export default function ReportViewPage() {
    return (
        <Box>
            <Paper variant='outlined' sx={{width: "100%"}}>
                <ReportGenerator/>
            </Paper>
        </Box>
    )
}