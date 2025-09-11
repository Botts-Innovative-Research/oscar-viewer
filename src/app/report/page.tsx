"use client"

import {
    Box,
    Paper,
    Typography
} from "@mui/material"
import React from "react";
import Report from "@/app/_components/reportgen/Report";

export default function ReportViewPage() {
    return (
        <Box>
            <Paper variant='outlined' sx={{width: "100%"}}>
                <Report/>
            </Paper>
        </Box>
    )
}