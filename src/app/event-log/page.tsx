"use client";

import React from "react";
import {Box} from "@mui/material";
import PageHost from "@/app/_components/layout/PageHost";
import PageToolbar from "@/app/_components/layout/PageToolbar";

export default function EventLogPage() {
    return (
        <Box sx={{width: '100%'}}>
            <PageToolbar pageId="event-log"/>
            <PageHost pageId="event-log"/>
        </Box>
    );
}
