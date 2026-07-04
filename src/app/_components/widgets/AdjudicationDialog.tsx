"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useContext, useState} from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import IsotopeSelect from "@/app/_components/adjudication/IsotopeSelect";
import SecondaryInspectionSelect from "@/app/_components/adjudication/SecondaryInspectionSelect";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import {generateAdjudicationCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {setAdjudicatedEventId, setSelectedEvent} from "@/lib/state/EventDataSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useRouter} from "next/dist/client/components/navigation";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface AdjudicationDialogProps {
    open: boolean;
    event: EventTableData | null;
    onClose: () => void;
}

/**
 * Compact adjudication form for table widgets. Submits through the lane's
 * adjudication control stream exactly like the event-details workflow; the
 * full page (file uploads, QR, WebID analysis) stays one click away.
 */
export default function AdjudicationDialog({open, event, onClose}: AdjudicationDialogProps) {
    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const {t} = useLanguage();

    const [adjCode, setAdjCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [isotopes, setIsotopes] = useState<string[]>([]);
    const [secondaryInspection, setSecondaryInspection] = useState('');
    const [vehicleId, setVehicleId] = useState('');
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [snack, setSnack] = useState<{ msg: string, severity: 'success' | 'error' } | null>(null);

    const resetForm = () => {
        setAdjCode(AdjudicationCodes.codes[0]);
        setIsotopes([]);
        setSecondaryInspection('');
        setVehicleId('');
        setFeedback('');
    };

    const handleOpenFullDetails = () => {
        if (!event) return;
        dispatch(setSelectedEvent(event));
        router.push("/event-details");
    };

    const handleSubmit = async () => {
        if (!event) return;
        if (!adjCode || adjCode === AdjudicationCodes.codes[0]) {
            setSnack({msg: t('adjSelectCode'), severity: 'error'});
            return;
        }

        setSubmitting(true);
        try {
            const entry: LaneMapEntry = laneMapRef.current?.get(event.laneId);
            if (!entry) throw new Error(`lane entry not found for ${event.laneId}`);

            const streams = entry.controlStreams.length > 0
                ? entry.controlStreams
                : await entry.parentNode.fetchNodeControlStreams();
            const adjControlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));
            if (!adjControlStream) throw new Error("adjudication control stream not found");

            let occupancyObsId = event.occupancyObsId;
            if (!occupancyObsId) {
                // Live rows may not carry the observation id yet — look it up.
                const ds = entry.datastreams.find((d: any) => d.properties.id === event.dataStreamId);
                if (ds) {
                    const query = await ds.searchObservations(new ObservationFilter({
                        filter: `startTime='${event.startTime}' AND endTime='${event.endTime}'`
                    }), 1);
                    const observations = await query.nextPage();
                    if (observations?.length > 0) {
                        occupancyObsId = observations[0].id;
                        event.setOccupancyObsId(occupancyObsId);
                    }
                }
            }
            if (!occupancyObsId) throw new Error("occupancy observation not found");

            const response = await sendCommand(
                entry.parentNode,
                adjControlStream.properties.id,
                generateAdjudicationCommandJSON(
                    feedback,
                    adjCode,
                    isotopes,
                    secondaryInspection,
                    [],
                    occupancyObsId,
                    vehicleId,
                )
            );
            if (!response.ok) throw new Error(`command rejected: ${response.status}`);

            dispatch(setSelectedEvent(event));
            dispatch(setAdjudicatedEventId(event.id));
            setSnack({msg: `${t('adjSuccess')} ${event.occupancyCount}`, severity: 'success'});
            resetForm();
            onClose();
        } catch (error) {
            console.error("Adjudication submit failed:", error);
            setSnack({msg: t('adjFailed'), severity: 'error'});
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>{t('adjudicate')}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{pt: 1}}>
                        <Typography variant="body2" color="text.secondary">
                            {event ? `${event.laneId} — ${t('occupancyId')} ${event.occupancyCount}` : ''}
                        </Typography>
                        <AdjudicationSelect adjCode={adjCode} onSelect={setAdjCode}/>
                        <IsotopeSelect isotopeValue={isotopes} onSelect={setIsotopes}/>
                        <SecondaryInspectionSelect secondarySelectVal={secondaryInspection} onSelect={setSecondaryInspection}/>
                        <TextField
                            label={t('vehicleId')}
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            size="small"
                            fullWidth
                        />
                        <TextField
                            label={t('feedback')}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleOpenFullDetails}>{t('details')}</Button>
                    <Button onClick={onClose}>{t('cancel')}</Button>
                    <Button onClick={handleSubmit} variant="contained" color="success" disabled={submitting || !event}>
                        {t('submit')}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={snack !== null}
                autoHideDuration={5000}
                onClose={() => setSnack(null)}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert severity={snack?.severity ?? 'success'} onClose={() => setSnack(null)}>
                    {snack?.msg}
                </Alert>
            </Snackbar>
        </>
    );
}
