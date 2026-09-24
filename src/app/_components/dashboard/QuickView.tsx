"use client";

import { Box, Grid, Paper } from '@mui/material';
import { useSelector } from "react-redux";
import {
    clearEventPreview,
    selectEventPreview,
    setSelectedRowId,
} from "@/lib/state/EventPreviewSlice";
import { EventPreview } from "@/app/_components/event-preview/EventPreview";
import MapComponent from '../maps/MapComponent';
import React, {useContext, useEffect, useState} from "react";
import CircularProgress from "@mui/material/CircularProgress";
import SuspenseLoad from "@/app/_components/SuspenseLoad";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useAppDispatch} from "@/lib/state/Hooks";

interface PreviewSelection {
    isOpen: boolean;
    eventData: {laneId?: string} | null;
}

export function shouldClearUnavailablePreview(
    eventPreview: PreviewSelection,
    laneMapReady: boolean,
    readyLaneNames: ReadonlySet<string>,
): boolean {
    if (!laneMapReady || !eventPreview.isOpen || !eventPreview.eventData)
        return false;

    const laneId = eventPreview.eventData.laneId;
    return !laneId || !readyLaneNames.has(laneId);
}

export default function QuickView() {
    const eventPreview = useSelector(selectEventPreview);
    const dispatch = useAppDispatch();
    const {laneMapReady, readyLaneNames} = useContext(DataSourceContext);
    const [isLoading, setIsLoading] = useState(true);
    const previewUnavailable = shouldClearUnavailablePreview(
        eventPreview,
        laneMapReady,
        readyLaneNames,
    );

    useEffect(() => {
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!previewUnavailable)
            return;

        dispatch(clearEventPreview());
        dispatch(setSelectedRowId(null));
    }, [dispatch, previewUnavailable]);

    if (isLoading) {
        return (
            <Grid item xs={4}>
                <Paper variant='outlined' sx={{height: "100%"}}>
                    <SuspenseLoad />
                </Paper>
            </Grid>
        )
    }

    return (
        <Grid container width={"100%"}>
            {eventPreview.isOpen && eventPreview.eventData && !previewUnavailable
                ? <EventPreview />
                : <MapComponent/>}
        </Grid>
    );
}
