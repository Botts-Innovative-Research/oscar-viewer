"use client"
import { Grid, Paper, Stack, Typography } from "@mui/material";
import EventTable from "@/app/_components/event-table/EventTable";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {useLanguage} from "@/app/contexts/LanguageContext";
import EventUuidLookup from "@/app/_components/event-table/EventUuidLookup";

export default function EventLogPage() {
    const { t } = useLanguage();
    const laneMap = useSelector((state: RootState) => selectLaneMap(state))

    return (
        <Grid container spacing={2} width={"100%"}>
            <Grid item xs={12}>
                <Stack
                    direction={{xs: "column", md: "row"}}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{md: "flex-start"}}
                >
                    <Typography variant="h4">
                        { t('events') }
                    </Typography>
                    <EventUuidLookup/>
                </Stack>
            </Grid>

            <Grid item xs={12} sx={{ gap: 2, minWidth: 0 }}>
                <Paper variant='outlined' sx={{ padding: 0 }}>
                    <EventTable tableMode={"eventlog"} viewLane viewAdjudicated laneMap={laneMap}/>
                </Paper>
            </Grid>
        </Grid>
    );
}
