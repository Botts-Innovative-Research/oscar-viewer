"use client";

import {Box} from '@mui/material';
import {SelectedEvent} from 'types/new-types';

import MapComponent from '@/app/_components/Map/MapComponent';
import {useSelector} from "react-redux";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import {EventPreview} from "@/app/_components/event-preview/EventPreview";


export default function QuickView() {
    const eventPreview = useSelector(selectEventPreview);

    const handleSelectedMarker = (event: SelectedEvent) => {
        console.log(event);
    };

    return (
        <Box>
            {eventPreview.isOpen ? (<EventPreview/>) : (<MapComponent/>)}
        </Box>
    );
}
