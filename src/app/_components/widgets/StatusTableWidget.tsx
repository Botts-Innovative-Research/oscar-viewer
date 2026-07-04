"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useContext, useState} from "react";
import {Box, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import {useSelector} from "react-redux";
import EventTable from "@/app/_components/event-table/EventTable";
import StatusTable from "@/app/_components/lane-view/StatusTable";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {StatusTableWidgetConfig} from "@/lib/layout/PageConfigTypes";
import {WidgetProps} from "@/app/_components/layout/WidgetTypes";
import {useResolvedLane} from "@/app/_components/layout/useResolvedLane";
import {useLanguage} from "@/app/contexts/LanguageContext";

/** Lane occupancy/fault log with the same toggle the lane view page offers. */
export default function StatusTableWidget({page, widget}: WidgetProps) {
    const config = widget.config as StatusTableWidgetConfig;
    const {t} = useLanguage();
    const lane = useResolvedLane(page, config.laneSource);
    const {laneMapRef} = useContext(DataSourceContext);
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [view, setView] = useState<'occupancy' | 'fault'>(config.defaultView ?? 'occupancy');

    if (!lane) {
        return (
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
                <Typography color="text.secondary">{t('noLaneSelected')}</Typography>
            </Box>
        );
    }

    const entry = laneMapRef.current?.get(lane);

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0}}>
            <Box sx={{display: 'flex', justifyContent: 'center', pb: 1}}>
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={view}
                    onChange={(_e, next) => next && setView(next)}
                >
                    <ToggleButton value="occupancy" disabled={view === 'occupancy'}>{t('occupancyTable')}</ToggleButton>
                    <ToggleButton value="fault" disabled={view === 'fault'}>{t('faultTable')}</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{flex: 1, minHeight: 0, display: view === 'occupancy' ? 'block' : 'none'}}>
                <EventTable
                    tableMode="lanelog"
                    laneMap={laneMap}
                    viewLane
                    viewAdjudicated
                    currentLane={lane}
                    tableHeight="100%"
                />
            </Box>
            <Box sx={{flex: 1, minHeight: 0, display: view === 'fault' ? 'block' : 'none'}}>
                {entry && <StatusTable currentLane={lane} entry={entry} tableHeight="100%"/>}
            </Box>
        </Box>
    );
}
