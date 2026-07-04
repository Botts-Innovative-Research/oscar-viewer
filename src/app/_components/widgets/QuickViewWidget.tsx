"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box} from "@mui/material";
import QuickView from "@/app/_components/dashboard/QuickView";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";

export default function QuickViewWidget(_props: WidgetProps) {
    return (
        <Box sx={{height: '100%', overflowY: 'auto'}}>
            <QuickView/>
        </Box>
    );
}
