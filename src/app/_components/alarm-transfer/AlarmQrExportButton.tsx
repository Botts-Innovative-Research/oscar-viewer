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
    Tooltip,
    Typography,
} from "@mui/material";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    alarmTransferFileName,
    AlarmTransferBuildResult,
    buildAlarmTransfer,
    serializeAlarmTransferDocument,
} from "@/lib/data/oscar/AlarmQrTransfer";
import {AlarmQrRaster, renderAlarmQrRaster} from "@/lib/data/oscar/AlarmQrRaster";
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
    const rawEventUuid = typeof event.occupancyObsId === "string" ? event.occupancyObsId : "";
    const eventUuid = rawEventUuid.trim();
    const exportReady = eventUuid.length > 0 && rawEventUuid.length <= 128;
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState<AlarmTransferBuildResult | null>(null);
    const [qrRaster, setQrRaster] = useState<AlarmQrRaster | null>(null);
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
        setQrRaster(null);
        setError("");
        setSharingFallback(false);

        void buildAlarmTransfer(event, lane)
            .then(async transfer => {
                const raster = transfer.qrFits
                    ? await renderAlarmQrRaster(transfer.transport)
                    : null;
                if (!cancelled) {
                    setResult(transfer);
                    setQrRaster(raster);
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
        if (!qrRaster || !result) return;
        const response = await fetch(qrRaster.sourceDataUrl);
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
            <Tooltip title={exportReady ? "" : t("occupancyUuidRequiredForExport")}>
                <span style={{display: "inline-flex"}}>
                    <Button
                        data-testid="alarm-qr-export-button"
                        variant="outlined"
                        startIcon={<QrCode2RoundedIcon/>}
                        onClick={() => setOpen(true)}
                        aria-label={t("exportAlarmQr")}
                        disabled={!exportReady}
                        sx={iconOnly ? {minWidth: 0, px: 1} : undefined}
                    >
                        {iconOnly ? null : t("exportAlarmQr")}
                    </Button>
                </span>
            </Tooltip>
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
                                {qrRaster ? (
                                    <Box sx={{width: "100%", overflow: "auto", display: "flex", justifyContent: "safe center"}}>
                                        <Box
                                            component="img"
                                            src={qrRaster.displayDataUrl}
                                            alt={t("alarmQrCodeAlt")}
                                            data-testid="alarm-qr-image"
                                            data-qr-version={qrRaster.version}
                                            data-qr-symbol-modules={qrRaster.symbolModules}
                                            data-qr-source-scale={qrRaster.sourceModuleScale}
                                            data-qr-source-size={qrRaster.sourcePixelSize}
                                            data-qr-display-scale={qrRaster.displayModuleScale}
                                            sx={{
                                                display: "block",
                                                flex: "0 0 auto",
                                                width: `${qrRaster.displayPixelSize}px`,
                                                height: `${qrRaster.displayPixelSize}px`,
                                                maxWidth: "none",
                                                imageRendering: "pixelated",
                                            }}
                                        />
                                    </Box>
                                ) : (
                                    <Alert severity="warning" sx={{width: "100%"}}>
                                        {t("alarmQrTooLarge")}
                                    </Alert>
                                )}
                                <Alert severity="info" sx={{width: "100%"}}>
                                    {t("alarmQrDownsampleNotice")}
                                </Alert>
                                <Stack spacing={0.5} sx={{width: "100%"}}>
                                    <Typography variant="caption" color="text.secondary">
                                        {t("occupancyUuid")}
                                    </Typography>
                                    <Typography data-testid="alarm-qr-export-uuid" variant="body2" sx={{overflowWrap: "anywhere"}}>
                                        {result.payload.event.observationId}
                                    </Typography>
                                </Stack>
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
                        disabled={!qrRaster}
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
