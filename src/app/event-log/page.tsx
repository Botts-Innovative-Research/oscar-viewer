"use client"
import { Box, Paper, Typography } from "@mui/material";
import EventTable from "@/app/_components/event-table/EventTable";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function EventLogPage() {
    const { t } = useLanguage();
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    return (
        <Box>
            <Typography variant="h4">
                { t('events') }
            </Typography>
            <br />
            <Paper variant='outlined' sx={{ height: "100%" }}>
                <EventTable tableMode={"eventlog"} viewLane viewAdjudicated laneMap={laneMap}/>
            </Paper>
        </Box>
    );
}