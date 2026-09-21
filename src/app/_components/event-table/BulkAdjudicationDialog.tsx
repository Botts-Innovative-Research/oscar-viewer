"use client";

import React, {useEffect, useState} from "react";
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AdjudicationSelect from "@/app/_components/adjudication/AdjudicationSelect";
import SecondaryInspectionSelect from "@/app/_components/adjudication/SecondaryInspectionSelect";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {BulkAdjudicationValues} from "@/lib/data/oscar/BulkAdjudication";

export interface BulkAdjudicationSummary {
    success: number;
    failed: number;
}

interface Props {
    open: boolean;
    count: number;
    allFiltered: boolean;
    t: (key: string, values?: Record<string, unknown>) => string;
    onClose: () => void;
    onSubmit: (
        values: BulkAdjudicationValues,
        retryFailures: boolean,
        onProgress: (complete: number, total: number) => void,
    ) => Promise<BulkAdjudicationSummary>;
}

export default function BulkAdjudicationDialog({open, count, allFiltered, t, onClose, onSubmit}: Props) {
    const [code, setCode] = useState<AdjudicationCode>(AdjudicationCodes.codes[0]);
    const [feedback, setFeedback] = useState("");
    const [vehicleId, setVehicleId] = useState("");
    const [secondaryInspection, setSecondaryInspection] = useState("NONE");
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState({complete: 0, total: 0});
    const [summary, setSummary] = useState<BulkAdjudicationSummary | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!open) return;
        setCode(AdjudicationCodes.codes[0]);
        setFeedback("");
        setVehicleId("");
        setSecondaryInspection("NONE");
        setProgress({complete: 0, total: 0});
        setSummary(null);
        setError("");
    }, [open]);

    const submit = async (retryFailures = false) => {
        if (!code.code) return;
        setRunning(true);
        setSummary(null);
        setError("");
        try {
            const result = await onSubmit(
                {adjudicationCode: code, feedback, vehicleId, secondaryInspectionStatus: secondaryInspection},
                retryFailures,
                (complete, total) => setProgress({complete, total}),
            );
            setSummary(result);
        } catch (submitError) {
            console.error("Bulk adjudication failed", submitError);
            setError(t("bulkAdjudicationFailed"));
        } finally {
            setRunning(false);
        }
    };

    return (
        <Dialog open={open} onClose={running ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>{t("bulkAdjudication")}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Alert severity="warning">
                        {allFiltered
                            ? t("bulkAdjudicationAllFilteredWarning", {count})
                            : t("bulkAdjudicationSelectedWarning", {count})}
                    </Alert>
                    <AdjudicationSelect onSelect={setCode} adjCode={code} />
                    <SecondaryInspectionSelect onSelect={setSecondaryInspection} secondarySelectVal={secondaryInspection} />
                    <TextField label={t("vehicleId")} value={vehicleId} onChange={event => setVehicleId(event.target.value)} helperText={t("bulkVehicleIdHelp")} />
                    <TextField label={t("notes")} value={feedback} onChange={event => setFeedback(event.target.value)} multiline minRows={3} />
                    {running && (
                        <Stack spacing={0.5}>
                            <LinearProgress variant={progress.total ? "determinate" : "indeterminate"} value={progress.total ? progress.complete / progress.total * 100 : 0} />
                            <Typography variant="caption">{t("bulkAdjudicationProgress", progress)}</Typography>
                        </Stack>
                    )}
                    {summary && (
                        <Alert severity={summary.failed ? "warning" : "success"}>
                            {t("bulkAdjudicationResult", {...summary})}
                        </Alert>
                    )}
                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={running} onClick={onClose}>{summary ? t("close") : t("cancel")}</Button>
                {Boolean(summary?.failed) && <Button disabled={running} onClick={() => submit(true)}>{t("retryFailed")}</Button>}
                <Button variant="contained" color="success" disabled={running || !code.code || count === 0} onClick={() => submit(false)}>
                    {t("adjudicateCount", {count})}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
