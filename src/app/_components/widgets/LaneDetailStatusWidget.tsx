"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React from "react";
import {Box, Typography} from "@mui/material";
import LaneStatusDetail from "@/app/_components/lane-view/LaneStatus";
import {LaneDetailStatusWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {useResolvedLane} from "@/app/_components/layout/useResolvedLane";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function LaneDetailStatusWidget({page, widget}: WidgetProps) {
    const config = widget.config as LaneDetailStatusWidgetConfig;
    const {t} = useLanguage();
    const lane = useResolvedLane(page, config.laneSource);

    if (!lane) {
        return (
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <Typography color="text.secondary">{t('noLaneSelected')}</Typography>
            </Box>
        );
    }

    return <LaneStatusDetail laneName={lane}/>;
}
