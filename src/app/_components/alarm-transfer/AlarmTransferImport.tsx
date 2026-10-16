"use client";

import React, {ChangeEvent, useCallback, useEffect, useMemo, useRef, useState} from "react";
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

type ScannerState = "idle" | "starting" | "scanning" | "validating" | "error";

export interface LiveQrScanner {
    readonly $overlay?: HTMLDivElement;
    start: () => Promise<void>;
    stop: () => void;
    pause: (stopStreamImmediately?: boolean) => Promise<boolean>;
    destroy: () => void;
    setCamera: (cameraId: string) => Promise<void>;
}

export interface LiveQrScannerOptions {
    onDecodeError: (error: Error | string) => void;
    calculateScanRegion: (video: HTMLVideoElement) => QrScanner.ScanRegion;
    preferredCamera: QrScanner.FacingMode | QrScanner.DeviceId;
    maxScansPerSecond: number;
    highlightScanRegion: boolean;
    highlightCodeOutline: boolean;
    returnDetailedScanResult: true;
}

export interface AlarmTransferImportProps {
    createScanner?: (
        video: HTMLVideoElement,
        onDecode: (result: QrScanner.ScanResult) => void,
        options: LiveQrScannerOptions,
    ) => LiveQrScanner;
    listCameras?: (requestLabels?: boolean) => Promise<QrScanner.Camera[]>;
    scanImage?: (file: File) => Promise<QrScanner.ScanResult>;
    decodeTransport?: (transport: string) => Promise<AlarmTransferDocument>;
    getCameraPermissionState?: () => Promise<PermissionState | undefined>;
}

const defaultCreateScanner: NonNullable<AlarmTransferImportProps["createScanner"]> =
    (video, onDecode, options) => new QrScanner(video, onDecode, options);
const defaultListCameras: NonNullable<AlarmTransferImportProps["listCameras"]> =
    requestLabels => QrScanner.listCameras(requestLabels);
const defaultScanImage: NonNullable<AlarmTransferImportProps["scanImage"]> =
    file => QrScanner.scanImage(file, {returnDetailedScanResult: true});
const defaultGetCameraPermissionState: NonNullable<AlarmTransferImportProps["getCameraPermissionState"]> = async () => {
    if (!navigator.permissions?.query) return undefined;
    try {
        return (await navigator.permissions.query({name: "camera" as PermissionName})).state;
    } catch {
        return undefined;
    }
};

interface ActiveCamera {
    label: string;
    width?: number;
    height?: number;
}

const LIVE_SCAN_SCALE = 0.875;

function calculateLiveScanRegion(video: HTMLVideoElement): QrScanner.ScanRegion {
    const size = Math.max(1, Math.round(Math.min(video.videoWidth, video.videoHeight) * LIVE_SCAN_SCALE));
    return {
        x: Math.round((video.videoWidth - size) / 2),
        y: Math.round((video.videoHeight - size) / 2),
        width: size,
        height: size,
    };
}

function isNoQrCodeResult(reason: Error | string): boolean {
    const message = reason instanceof Error ? reason.message : String(reason);
    return message === QrScanner.NO_QR_CODE_FOUND
        || message === `Scanner error: ${QrScanner.NO_QR_CODE_FOUND}`;
}

function isCameraPermissionDenied(reason: unknown): boolean {
    const name = reason instanceof DOMException ? reason.name : "";
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    return name === "NotAllowedError"
        || /notallowederror/i.test(message)
        || /permission\s+(?:was\s+)?denied/i.test(message);
}

function isGenericCameraNotFound(reason: unknown): boolean {
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    return message.trim().toLowerCase() === "camera not found.";
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

export default function AlarmTransferImport({
    createScanner = defaultCreateScanner,
    listCameras = defaultListCameras,
    scanImage = defaultScanImage,
    decodeTransport = decodeAlarmTransfer,
    getCameraPermissionState = defaultGetCameraPermissionState,
}: AlarmTransferImportProps = {}) {
    const {language, t} = useLanguage();
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<LiveQrScanner>();
    const streamRef = useRef<MediaStream | null>(null);
    const scannerStateRef = useRef<ScannerState>("idle");
    const scannerSessionRef = useRef(0);
    const decodeLatchedRef = useRef(false);
    const mountedRef = useRef(true);
    const camerasRef = useRef<QrScanner.Camera[]>([]);
    const alarmFileRef = useRef<HTMLInputElement>(null);
    const qrImageRef = useRef<HTMLInputElement>(null);
    const [document, setDocument] = useState<AlarmTransferDocument | null>(null);
    const [manualPayload, setManualPayload] = useState("");
    const [scannerState, setScannerState] = useState<ScannerState>("idle");
    const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
    const [selectedCamera, setSelectedCamera] = useState("");
    const [activeCamera, setActiveCamera] = useState<ActiveCamera | null>(null);
    const [scannerError, setScannerError] = useState("");
    const [error, setError] = useState("");
    const [sharingFallback, setSharingFallback] = useState(false);

    const file = useMemo(() => document ? new File(
        [serializeAlarmTransferDocument(document)],
        alarmTransferFileName(document.payload),
        {type: "application/vnd.oscar.alarm+json"},
    ) : null, [document]);

    const transitionScanner = useCallback((nextState: ScannerState) => {
        scannerStateRef.current = nextState;
        if (mountedRef.current) setScannerState(nextState);
    }, []);

    const destroyScanner = useCallback(() => {
        const video = videoRef.current;
        const stream = (video?.srcObject as MediaStream | null) ?? streamRef.current;
        const scanner = scannerRef.current;
        const overlay = scanner?.$overlay;
        scannerRef.current = undefined;
        if (scanner) {
            try {
                scanner.stop();
            } catch {
                // Continue teardown even if a partially initialized scanner cannot stop cleanly.
            }
            try {
                scanner.destroy();
            } catch {
                // Explicitly stopping the captured tracks below is the final cleanup fallback.
            }
        }

        try {
            (overlay?.getAnimations?.({subtree: true}) ?? []).forEach(animation => animation.cancel());
        } catch {
            // Animation cleanup is best-effort and must never prevent camera-track shutdown.
        }
        try {
            overlay?.remove();
        } catch {
            // The track cleanup below is the mandatory part of teardown.
        }

        if (stream && "getTracks" in stream) {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch {
                    // Continue closing any remaining tracks.
                }
            });
        }
        streamRef.current = null;
        if (video) video.srcObject = null;
        decodeLatchedRef.current = false;
    }, []);

    const stopScanner = useCallback(() => {
        scannerSessionRef.current += 1;
        destroyScanner();
        setScannerError("");
        setActiveCamera(null);
        transitionScanner("idle");
    }, [destroyScanner, transitionScanner]);

    const completeImport = useCallback((decoded: AlarmTransferDocument) => {
        scannerSessionRef.current += 1;
        destroyScanner();
        if (!mountedRef.current) return;
        setActiveCamera(null);
        transitionScanner("idle");
        setDocument(decoded);
    }, [destroyScanner, transitionScanner]);

    const acceptTransport = useCallback(async (transport: string) => {
        setError("");
        setSharingFallback(false);
        try {
            completeImport(await decodeTransport(transport));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        }
    }, [completeImport, decodeTransport]);

    const failScanner = useCallback((reason: unknown, fallback: string) => {
        scannerSessionRef.current += 1;
        destroyScanner();
        setActiveCamera(null);
        setScannerError(reason instanceof Error ? reason.message : String(reason || fallback));
        transitionScanner("error");
    }, [destroyScanner, transitionScanner]);

    const updateActiveCamera = useCallback(() => {
        const video = videoRef.current;
        streamRef.current = video?.srcObject as MediaStream | null;
        const track = (video?.srcObject as MediaStream | null)?.getVideoTracks?.()[0];
        const settings = track?.getSettings?.() ?? {};
        const deviceId = settings.deviceId ?? selectedCamera;
        const camera = camerasRef.current.find(candidate => candidate.id === deviceId)
            ?? camerasRef.current.find(candidate => candidate.label === track?.label);
        const label = camera?.label || track?.label || t("alarmQrUnknownCamera");
        const width = video?.videoWidth || settings.width;
        const height = video?.videoHeight || settings.height;
        setActiveCamera({label, width: width || undefined, height: height || undefined});
        if (deviceId || camera?.id) setSelectedCamera(deviceId || camera!.id);
    }, [selectedCamera, t]);

    const startScanner = useCallback(() => {
        if (scannerStateRef.current !== "idle" && scannerStateRef.current !== "error") return;
        setError("");
        setScannerError("");
        decodeLatchedRef.current = false;
        scannerSessionRef.current += 1;
        transitionScanner("starting");
    }, [transitionScanner]);

    useEffect(() => {
        if (scannerState !== "starting" || scannerRef.current) return;
        const session = scannerSessionRef.current;
        const frame = requestAnimationFrame(() => {
            const video = videoRef.current;
            if (!video || session !== scannerSessionRef.current) return;

            const bounds = video.getBoundingClientRect();
            if (getComputedStyle(video).display === "none" || bounds.width <= 0 || bounds.height <= 0) {
                failScanner(new Error(t("alarmQrCameraVideoUnavailable")), t("alarmQrCameraError"));
                return;
            }

            let scanner: LiveQrScanner;
            try {
                scanner = createScanner(
                    video,
                    result => {
                        if (
                            decodeLatchedRef.current
                            || scannerStateRef.current !== "scanning"
                            || scannerRef.current !== scanner
                        ) return;

                        decodeLatchedRef.current = true;
                        transitionScanner("validating");
                        void (async () => {
                            try {
                                await scanner.pause(true);
                            } catch {
                                // Validation is still safe because the synchronous latch rejects duplicate frames.
                            }
                            if (session !== scannerSessionRef.current || scannerRef.current !== scanner) return;
                            try {
                                const decoded = await decodeTransport(result.data);
                                if (session !== scannerSessionRef.current || scannerRef.current !== scanner) return;
                                completeImport(decoded);
                            } catch (reason) {
                                failScanner(reason, t("alarmQrCameraError"));
                            }
                        })();
                    },
                    {
                        preferredCamera: selectedCamera || "environment",
                        calculateScanRegion: calculateLiveScanRegion,
                        maxScansPerSecond: 10,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        returnDetailedScanResult: true,
                        onDecodeError: reason => {
                            if (isNoQrCodeResult(reason)) return;
                            if (session === scannerSessionRef.current && scannerRef.current === scanner) {
                                failScanner(reason, t("alarmQrCameraError"));
                            }
                        },
                    },
                );
            } catch (reason) {
                failScanner(reason, t("alarmQrCameraError"));
                return;
            }
            scannerRef.current = scanner;

            void scanner.start().then(async () => {
                if (session !== scannerSessionRef.current || scannerRef.current !== scanner) {
                    scanner.destroy();
                    return;
                }
                streamRef.current = video.srcObject as MediaStream | null;
                transitionScanner("scanning");
                updateActiveCamera();
                try {
                    const availableCameras = await listCameras(true);
                    if (session !== scannerSessionRef.current || scannerRef.current !== scanner) return;
                    camerasRef.current = availableCameras;
                    setCameras(availableCameras);
                    updateActiveCamera();
                } catch {
                    // A working active camera is still useful when enumeration is unavailable.
                }
            }).catch(async reason => {
                if (session !== scannerSessionRef.current || scannerRef.current !== scanner) return;
                let permissionState: PermissionState | undefined;
                try {
                    permissionState = await getCameraPermissionState();
                } catch {
                    // Permissions API support varies; the scanner error remains a safe fallback.
                }
                if (session !== scannerSessionRef.current || scannerRef.current !== scanner) return;
                const message = isCameraPermissionDenied(reason) || permissionState === "denied"
                    ? t("alarmQrCameraPermissionDenied")
                    : isGenericCameraNotFound(reason)
                        ? t("alarmQrCameraUnavailable")
                        : reason;
                failScanner(message, t("alarmQrCameraError"));
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [completeImport, createScanner, decodeTransport, failScanner, getCameraPermissionState, listCameras, scannerState, selectedCamera, t, transitionScanner, updateActiveCamera]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            scannerSessionRef.current += 1;
            destroyScanner();
        };
    }, [destroyScanner]);

    const changeCamera = async (event: ChangeEvent<HTMLInputElement>) => {
        const cameraId = event.target.value;
        const scanner = scannerRef.current;
        if (!cameraId || !scanner || scannerStateRef.current !== "scanning") return;
        setSelectedCamera(cameraId);
        try {
            await scanner.setCamera(cameraId);
            if (scannerRef.current === scanner) updateActiveCamera();
        } catch (reason) {
            failScanner(reason, t("alarmQrCameraError"));
        }
    };

    const importAlarmFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0];
        event.target.value = "";
        if (!selected) return;
        try {
            setError("");
            completeImport(await parseAlarmTransferFile(await selected.text()));
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
            const result = await scanImage(selected);
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
                            <Grid item xs={12}>
                                <b>{t("occupancyUuid")}</b><br/>
                                <span data-testid="alarm-transfer-import-uuid" style={{overflowWrap: "anywhere"}}>
                                    {payload.event.observationId ?? t("legacyOccupancyUuidUnavailable")}
                                </span>
                            </Grid>
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

    const videoVisible = scannerState === "starting" || scannerState === "scanning" || scannerState === "validating";
    const scannerStatus = scannerState === "idle"
        ? t("alarmQrCameraIdle")
        : scannerState === "starting"
            ? t("alarmQrCameraStarting")
            : scannerState === "scanning"
                ? t("alarmQrCameraScanning")
                : scannerState === "validating"
                    ? t("alarmQrCameraValidating")
                    : t("alarmQrCameraStoppedError", {error: scannerError || t("alarmQrCameraError")});

    return (
        <Stack spacing={2}>
            <Alert severity="info">{t("alarmQrImportInstructions")}</Alert>
            <Box
                data-testid="alarm-qr-camera-preview"
                sx={{
                    position: "relative",
                    width: "100%",
                    height: {xs: 240, sm: 360},
                    maxHeight: 480,
                    display: videoVisible ? "block" : "none",
                }}
            >
                <Box
                    component="video"
                    ref={videoRef}
                    muted
                    playsInline
                    onLoadedMetadata={updateActiveCamera}
                    data-testid="alarm-qr-camera-video"
                    sx={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        bgcolor: "black",
                    }}
                />
            </Box>
            <Alert
                severity={scannerState === "error" ? "error" : scannerState === "scanning" ? "success" : "info"}
                role={scannerState === "error" ? "alert" : "status"}
                aria-live={scannerState === "error" ? "assertive" : "polite"}
                data-testid="alarm-qr-camera-status"
            >
                {scannerStatus}
            </Alert>
            {videoVisible && activeCamera && (
                <Typography variant="body2" color="text.secondary" data-testid="alarm-qr-active-camera">
                    {t("alarmQrActiveCamera", {camera: activeCamera.label})}
                    {activeCamera.width && activeCamera.height
                        ? ` · ${t("alarmQrCameraResolution", {width: activeCamera.width, height: activeCamera.height})}`
                        : ""}
                </Typography>
            )}
            {videoVisible && cameras.length > 1 && (
                <TextField
                    select
                    size="small"
                    label={t("alarmQrCameraSelector")}
                    value={selectedCamera}
                    onChange={changeCamera}
                    disabled={scannerState !== "scanning"}
                    SelectProps={{native: true}}
                    inputProps={{"data-testid": "alarm-qr-camera-selector"}}
                >
                    {cameras.map(camera => (
                        <option key={camera.id} value={camera.id}>{camera.label || t("alarmQrUnknownCamera")}</option>
                    ))}
                </TextField>
            )}
            <Stack direction={{xs: "column", sm: "row"}} spacing={1} flexWrap="wrap">
                {scannerState === "idle" || scannerState === "error" ? (
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
            <input ref={qrImageRef} data-testid="alarm-qr-image-input" hidden type="file" accept="image/*" onChange={scanQrImage}/>
            <input ref={alarmFileRef} data-testid="alarm-transfer-file-input" hidden type="file" accept=".json,.oscar-alarm.json,application/json,application/vnd.oscar.alarm+json" onChange={importAlarmFile}/>
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
