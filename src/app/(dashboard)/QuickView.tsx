"use client";

import {Box} from '@mui/material';
import {SelectedEvent} from 'types/new-types';

import {useSelector} from "react-redux";
import {selectEventPreview} from "@/lib/state/OSCARClientSlice";
import {EventPreview} from "@/app/_components/event-preview/EventPreview";
import MapComponent from '../_components/maps/MapComponent';


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
