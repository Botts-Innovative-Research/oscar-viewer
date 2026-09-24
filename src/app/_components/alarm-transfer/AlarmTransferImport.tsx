"use client";

import React, {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Divider,
    Grid,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import ImageSearchRoundedIcon from "@mui/icons-material/ImageSearchRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ShareRoundedIcon from "@mui/icons-material/ShareRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import QrScanner from "qr-scanner";
import {
    alarmTransferFileName,
    AlarmTransferDocument,
    decodeAlarmTransfer,
    parseAlarmTransferFile,
    serializeAlarmTransferDocument,
} from "@/lib/data/oscar/AlarmQrTransfer";
import AlarmTransferCharts from "@/app/_components/alarm-transfer/AlarmTransferCharts";
import {useLanguage} from "@/app/contexts/LanguageContext";
import {getIntlLocale} from "@/app/utils/LocaleUtils";

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

export default function AlarmTransferImport() {
    const {language, t} = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScanner>();
    const alarmFileRef = useRef<HTMLInputElement>(null);
    const qrImageRef = useRef<HTMLInputElement>(null);
    const [document, setDocument] = useState<AlarmTransferDocument | null>(null);
    const [manualPayload, setManualPayload] = useState("");
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState("");
    const [sharingFallback, setSharingFallback] = useState(false);

    const file = useMemo(() => document ? new File(
        [serializeAlarmTransferDocument(document)],
        alarmTransferFileName(document.payload),
        {type: "application/vnd.oscar.alarm+json"},
    ) : null, [document]);

    const acceptTransport = async (transport: string) => {
        setError("");
        setSharingFallback(false);
        try {
            const decoded = await decodeAlarmTransfer(transport);
            setDocument(decoded);
            scannerRef.current?.stop();
            setScanning(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    };

    const startScanner = async () => {
        setError("");
        if (!videoRef.current) return;
        scannerRef.current?.destroy();
        const scanner = new QrScanner(
            videoRef.current,
            result => { void acceptTransport(result.data); },
            {
                preferredCamera: "environment",
                highlightScanRegion: true,
                highlightCodeOutline: true,
                returnDetailedScanResult: true,
                onDecodeError: () => undefined,
            },
        );
        scannerRef.current = scanner;
        try {
            await scanner.start();
            setScanning(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : t("alarmQrCameraError"));
            scanner.destroy();
            scannerRef.current = undefined;
        }
    };

    const stopScanner = () => {
        scannerRef.current?.stop();
        setScanning(false);
    };

    useEffect(() => () => scannerRef.current?.destroy(), []);

    const importAlarmFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        try {
            setError("");
            setDocument(await parseAlarmTransferFile(await selected.text()));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    };

    const scanQrImage = async (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        try {
            setError("");
            const result = await QrScanner.scanImage(selected, {returnDetailedScanResult: true});
            await acceptTransport(result.data);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    };

    const download = () => {
        if (file) saveBlob(file, file.name);
    };

    const share = async () => {
        if (!file || !document) return;
        const data = {
            title: t("alarmQrShareTitle", {occupancyId: document.payload.event.occupancyId}),
            text: t("alarmQrShareText", {
                lane: document.payload.source.laneId,
                occupancyId: document.payload.event.occupancyId,
            }),
            files: [file],
        };
        if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
            try {
                await navigator.share(data);
                return;
            } catch (reason: any) {
                if (reason?.name === "AbortError") return;
            }
        }
        download();
        setSharingFallback(true);
    };

    const reset = () => {
        stopScanner();
        setDocument(null);
        setManualPayload("");
        setError("");
        setSharingFallback(false);
    };

    if (document) {
        const payload = document.payload;
        return (
            <Stack spacing={2}>
                <Alert severity="success">{t("alarmQrIntegrityVerified")}</Alert>
                <Alert severity="warning">{t("alarmQrAuthenticityWarning")}</Alert>
                <Card variant="outlined">
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}><b>{t("sourceNode")}</b><br/>{payload.source.nodeName ?? payload.source.nodeId}</Grid>
                            <Grid item xs={6} md={3}><b>{t("laneId")}</b><br/>{payload.source.laneId}</Grid>
                            <Grid item xs={6} md={3}><b>{t("occupancyId")}</b><br/>{payload.event.occupancyId}</Grid>
                            <Grid item xs={6} md={3}><b>{t("status")}</b><br/>{payload.event.status}</Grid>
                            <Grid item xs={6} md={3}><b>{t("startTime")}</b><br/>{new Date(payload.event.startTime).toLocaleString(getIntlLocale(language))}</Grid>
                            <Grid item xs={6} md={3}><b>{t("endTime")}</b><br/>{new Date(payload.event.endTime).toLocaleString(getIntlLocale(language))}</Grid>
                            <Grid item xs={6} md={3}><b>{t("maxGamma")}</b><br/>{payload.event.maxGamma ?? t("unknown")}</Grid>
                            <Grid item xs={6} md={3}><b>{t("maxNeutron")}</b><br/>{payload.event.maxNeutron ?? t("unknown")}</Grid>
                        </Grid>
                    </CardContent>
                </Card>
                <Card variant="outlined"><CardContent><AlarmTransferCharts payload={payload}/></CardContent></Card>
                <Typography variant="body2" color="text.secondary">
                    {t("alarmQrIncludedPoints", {
                        gammaExported: payload.series.gamma.exportedCount,
                        gammaOriginal: payload.series.gamma.originalCount,
                        neutronExported: payload.series.neutron.exportedCount,
                        neutronOriginal: payload.series.neutron.originalCount,
                    })}
                </Typography>
                {sharingFallback && <Alert severity="info">{t("alarmQrShareFallback")}</Alert>}
                <Stack direction={{xs: "column", sm: "row"}} spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon/>} onClick={download}>{t("downloadAlarmFile")}</Button>
                    <Button variant="contained" startIcon={<ShareRoundedIcon/>} onClick={share}>{t("shareAlarm")}</Button>
                    <Button startIcon={<RestartAltRoundedIcon/>} onClick={reset}>{t("scanAnotherAlarm")}</Button>
                </Stack>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <Alert severity="info">{t("alarmQrImportInstructions")}</Alert>
            <Box
                component="video"
                ref={videoRef}
                muted
                playsInline
                sx={{width: "100%", maxHeight: 480, bgcolor: "black", display: scanning ? "block" : "none"}}
            />
            <Stack direction={{xs: "column", sm: "row"}} spacing={1} flexWrap="wrap">
                {!scanning ? (
                    <Button variant="contained" startIcon={<QrCodeScannerRoundedIcon/>} onClick={startScanner}>
                        {t("startCameraScan")}
                    </Button>
                ) : (
                    <Button color="error" variant="outlined" startIcon={<StopCircleRoundedIcon/>} onClick={stopScanner}>
                        {t("stopCameraScan")}
                    </Button>
                )}
                <Button variant="outlined" startIcon={<ImageSearchRoundedIcon/>} onClick={() => qrImageRef.current?.click()}>
                    {t("scanQrImage")}
                </Button>
                <Button variant="outlined" startIcon={<UploadFileRoundedIcon/>} onClick={() => alarmFileRef.current?.click()}>
                    {t("importAlarmFile")}
                </Button>
            </Stack>
            <input ref={qrImageRef} hidden type="file" accept="image/*" onChange={scanQrImage}/>
            <input ref={alarmFileRef} hidden type="file" accept=".json,.oscar-alarm.json,application/json,application/vnd.oscar.alarm+json" onChange={importAlarmFile}/>
            <Divider>{t("or")}</Divider>
            <TextField
                multiline
                minRows={4}
                value={manualPayload}
                onChange={event => setManualPayload(event.target.value)}
                label={t("pasteQrPayload")}
            />
            <Button
                variant="outlined"
                disabled={!manualPayload.trim()}
                onClick={() => void acceptTransport(manualPayload)}
            >
                {t("decodeQrPayload")}
            </Button>
            {error && <Alert severity="error">{t("alarmQrInvalid", {error})}</Alert>}
        </Stack>
    );
}
