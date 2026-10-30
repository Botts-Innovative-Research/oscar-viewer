"use client";

import React, {useEffect, useMemo, useState} from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import QRCode from "qrcode";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    alarmTransferFileName,
    AlarmTransferBuildResult,
    buildAlarmTransfer,
    serializeAlarmTransferDocument,
} from "@/lib/data/oscar/AlarmQrTransfer";
import {useLanguage} from "@/app/contexts/LanguageContext";

interface Props {
    event: EventTableData;
    lane: LaneMapEntry;
    iconOnly?: boolean;
}

function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export default function AlarmQrExportButton({event, lane, iconOnly = false}: Props) {
    const {t} = useLanguage();
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<AlarmTransferBuildResult | null>(null);
    const [qrImage, setQrImage] = useState("");
    const [error, setError] = useState("");
    const [sharingFallback, setSharingFallback] = useState(false);

    const alarmFile = useMemo(() => {
        if (!result) return null;
        return new File(
            [serializeAlarmTransferDocument(result)],
            alarmTransferFileName(result.payload),
            {type: "application/vnd.oscar.alarm+json"},
        );
    }, [result]);

    useEffect(() => {
        let cancelled = false;
        if (!open) return;
        setResult(null);
        setQrImage("");
        setError("");
        setSharingFallback(false);

        void buildAlarmTransfer(event, lane)
            .then(async transfer => {
                const image = transfer.qrFits
                    ? await QRCode.toDataURL(transfer.transport, {
                        errorCorrectionLevel: "M",
                        margin: 4,
                        width: 640,
                        color: {dark: "#000000", light: "#ffffff"},
                    })
                    : "";
                if (!cancelled) {
                    setResult(transfer);
                    setQrImage(image);
                }
            })
            .catch(reason => {
                if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
            });
        return () => { cancelled = true; };
    }, [event, lane, open]);

    const downloadAlarm = () => {
        if (!alarmFile) return;
        saveBlob(alarmFile, alarmFile.name);
    };

    const downloadQr = async () => {
        if (!qrImage || !result) return;
        const response = await fetch(qrImage);
        saveBlob(await response.blob(), `${alarmTransferFileName(result.payload).replace(/\.json$/, "")}.png`);
    };

    const shareAlarm = async () => {
        if (!alarmFile || !result) return;
        const shareData = {
            title: t("alarmQrShareTitle", {occupancyId: result.payload.event.occupancyId}),
            text: t("alarmQrShareText", {
                lane: result.payload.source.laneId,
                occupancyId: result.payload.event.occupancyId,
            }),
            files: [alarmFile],
        };
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            try {
                await navigator.share(shareData);
                return;
            } catch (reason: any) {
                if (reason?.name === "AbortError") return;
            }
        }
        downloadAlarm();
        setSharingFallback(true);
    };

    return (
        <>
            <Button
                variant="outlined"
                startIcon={<QrCode2RoundedIcon/>}
                onClick={() => setOpen(true)}
                aria-label={t("exportAlarmQr")}
                sx={iconOnly ? {minWidth: 0, px: 1} : undefined}
            >
                {iconOnly ? null : t("exportAlarmQr")}
            </Button>
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t("alarmQrExportTitle")}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} alignItems="center" sx={{pt: 1}}>
                        <Alert severity="warning" sx={{width: "100%"}}>
                            {t("alarmQrSecurityWarning")}
                        </Alert>
                        {!result && !error && (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CircularProgress size={24}/>
                                <Typography>{t("alarmQrGenerating")}</Typography>
                            </Stack>
                        )}
                        {error && <Alert severity="error" sx={{width: "100%"}}>{error}</Alert>}
                        {result && (
                            <>
                                {qrImage ? (
                                    <Box
                                        component="img"
                                        src={qrImage}
                                        alt={t("alarmQrCodeAlt")}
                                        sx={{width: "100%", maxWidth: 520, imageRendering: "pixelated"}}
                                    />
                                ) : (
                                    <Alert severity="warning" sx={{width: "100%"}}>
                                        {t("alarmQrTooLarge")}
                                    </Alert>
                                )}
                                <Alert severity="info" sx={{width: "100%"}}>
                                    {t("alarmQrDownsampleNotice")}
                                </Alert>
                                <Typography variant="body2" textAlign="center">
                                    {t("alarmQrIncludedPoints", {
                                        gammaExported: result.payload.series.gamma.exportedCount,
                                        gammaOriginal: result.payload.series.gamma.originalCount,
                                        neutronExported: result.payload.series.neutron.exportedCount,
                                        neutronOriginal: result.payload.series.neutron.originalCount,
                                    })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {t("alarmQrPayloadSize", {characters: result.qrCharacters})}
                                </Typography>
                                {sharingFallback && (
                                    <Alert severity="info" sx={{width: "100%"}}>
                                        {t("alarmQrShareFallback")}
                                    </Alert>
                                )}
                            </>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{flexWrap: "wrap"}}>
                    <Button onClick={() => setOpen(false)}>{t("close")}</Button>
                    <Button
                        onClick={downloadQr}
                        disabled={!qrImage}
                        startIcon={<ImageRoundedIcon/>}
                    >
                        {t("downloadQrImage")}
                    </Button>
                    <Button
                        onClick={downloadAlarm}
                        disabled={!result}
                        startIcon={<DownloadRoundedIcon/>}
                    >
                        {t("downloadAlarmFile")}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={shareAlarm}
                        disabled={!result}
                        startIcon={<ShareRoundedIcon/>}
                    >
                        {t("shareAlarm")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
