"use client";

import React, {useState} from "react";
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField} from "@mui/material";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {occupancyDetailsPath, resolveOccupancyId, SharedOccupancyError} from "@/lib/data/oscar/SharedOccupancy";
import {useLanguage} from "@/app/contexts/LanguageContext";

export default function ShareOccupancyButton({event, lane}: {event: EventTableData; lane: LaneMapEntry}) {
    const {t} = useLanguage();
    const [open, setOpen] = useState(false);
    const [link, setLink] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const share = async () => {
        setOpen(true);
        setLoading(true);
        setLink("");
        setError("");
        setCopied(false);
        setCopyFailed(false);
        try {
            const id = await resolveOccupancyId(event, lane);
            setLink(new URL(occupancyDetailsPath(id, lane.parentNode), window.location.origin).href);
        } catch (error) {
            setError(error instanceof SharedOccupancyError ? error.translationKey : "shareOccupancyFailed");
        } finally {
            setLoading(false);
        }
    };
    return <>
        <Button variant="outlined" startIcon={<ShareRoundedIcon/>} onClick={share} disabled={loading}>
            {t("shareOccupancy")}
        </Button>
        <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>{t("shareOccupancy")}</DialogTitle>
            <DialogContent>
                {error ? <Alert severity="error">{t(error)}</Alert> : loading ? t("loading") : <>
                    <TextField label={t("occupancyLink")} value={link} fullWidth margin="normal"
                        InputProps={{readOnly: true}} onFocus={event => event.target.select()}/>
                    <Alert severity="info">{t("sharedOccupancyAccessRequired")}</Alert>
                </>}
                {copied && <Alert severity="success">{t("linkCopied")}</Alert>}
                {copyFailed && <Alert severity="warning">{t("shareOccupancyCopyFailed")}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpen(false)}>{t("close")}</Button>
                {error && <Button onClick={share}>{t("retry")}</Button>}
                <Button disabled={!link || loading} onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(link);
                        setCopied(true);
                        setCopyFailed(false);
                    } catch {
                        // The visible, selectable link also works on HTTP without Clipboard access.
                        setCopyFailed(true);
                    }
                }}>{t("copyLink")}</Button>
            </DialogActions>
        </Dialog>
    </>;
}
