"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box} from "@mui/material";
import NationalStatsPanel from "@/app/_components/national/NationalStatsPanel";
import {NationalStatsWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";

export default function NationalStatsWidget({widget}: WidgetProps) {
    const config = widget.config as NationalStatsWidgetConfig;
    return (
        <Box sx={{height: '100%', overflowY: 'auto'}}>
            <NationalStatsPanel defaultTimeRange={config.defaultTimeRange}/>
        </Box>
    );
}
