/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IconButton, Stack, TextField, Typography} from "@mui/material";
import OpenInFullRoundedIcon from "@mui/icons-material/OpenInFullRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AdjudicationSelect from "@/app/_components/event-preview/AdjudicationSelect";
import {useContext} from "react";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {useSelector} from "react-redux";
import {selectEventPreview, setEventPreview, setShouldForceAlarmTableDeselect} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";

export function EventPreview() {
    const dispatch = useAppDispatch();
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const eventPreview = useSelector(selectEventPreview);

    const handleAdjudication = (value: string) => {
        console.log("Adjudication Value: ", value);
    }

    const handleCloseRounded = () => {
        console.log("Close Rounded");
        dispatch(setEventPreview({
            isOpen: false,
            eventData: null
        }));
        dispatch(setShouldForceAlarmTableDeselect(true))
    }

    return (
        <Stack p={1} display={"flex"}>
            <Stack direction={"row"} justifyContent={"space-between"} spacing={1}>
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <Typography variant="h6">Occupancy ID: {eventPreview.eventData.id}</Typography>
                    <IconButton aria-label="expand">
                        <OpenInFullRoundedIcon fontSize="small"/>
                    </IconButton>
                </Stack>
                <IconButton onClick={handleCloseRounded} aria-label="close">
                    <CloseRoundedIcon fontSize="small"/>
                </IconButton>
            </Stack>
            <AdjudicationSelect onSelect={handleAdjudication}/>
            <TextField
                id="outlined-multiline-static"
                label="Notes"
                multiline
                rows={4}
            />
        </Stack>
    )
}
