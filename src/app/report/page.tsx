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
        <Box sx={{margin: 2, width: '100%', height: "100%", padding: 2}}>
            <Report/>
        </Box>
    )
}