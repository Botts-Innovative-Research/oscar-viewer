"use client";

import { Box } from '@mui/material';
import { useSelector } from "react-redux";
import {selectEventPreview} from "@/lib/state/EventPreviewSlice";
import { EventPreview } from "@/app/_components/event-preview/EventPreview";
import MapComponent from '../maps/MapComponent';
import React, { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";

export default function QuickView() {
    const eventPreview = useSelector(selectEventPreview);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <Box sx={{display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                <CircularProgress/>
            </Box>
        )
    }

    // The event preview is a tall form and needs to scroll; the map must not,
    // or it scrolls instead of fitting. So the overflow lives on the branch
    // that needs it rather than on a shared wrapper.
    if (eventPreview.isOpen && eventPreview.eventData) {
        return (
            <Box sx={{width: '100%', height: '100%', minHeight: 0, overflowY: 'auto'}}>
                <EventPreview/>
            </Box>
        );
    }

    return (
        <Box sx={{width: '100%', height: '100%', minHeight: 0}}>
            {/* height="100%" so the map fills its widget cell — the default is
                100vh, which overflows the card. Cf. MapWidget. */}
            <MapComponent height="100%"/>
        </Box>
    );
}
