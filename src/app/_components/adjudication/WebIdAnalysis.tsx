/*
 * Copyright (c) 2024. Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stack, Typography, Button, Box } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QrScanner from 'qr-scanner';

export default function WebIdAnalysis(props: { onDataFound: (data: string) => void }) {
    const { t } = useLanguage();
    const [isScanning, setIsScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScanner | null>(null);

    const startScan = async () => {
        setIsScanning(true);
        if (videoRef.current) {
            scannerRef.current = new QrScanner(
                videoRef.current,
                (result) => {
                    props.onDataFound(result.data);
                    stopScan();
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );
            await scannerRef.current.start();
        }
    };

    const stopScan = () => {
        scannerRef.current?.stop();
        scannerRef.current?.destroy();
        scannerRef.current = null;
        setIsScanning(false);
    };

    useEffect(() => {
        return () => {
            stopScan();
        };
    }, []);

    return (
        <Stack spacing={2} p={2} border="1px dashed grey" borderRadius={2}>
            <Typography variant="h6">
                <QrCodeScannerIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                {t('webIdQrAnalysis')}
            </Typography>
            {isScanning ? (
                <Box>
                    <Typography color="info.main">{t('qrScanningStatus')}</Typography>
                    <video ref={videoRef} style={{ width: '100%', maxWidth: '400px', marginTop: '10px' }} />
                    <Button variant="outlined" color="error" onClick={stopScan} sx={{ mt: 1 }}>
                        {t('cancel')}
                    </Button>
                </Box>
            ) : (
                <Box>
                    <Button variant="contained" onClick={startScan}>
                        {t('qrStartScan')}
                    </Button>
                </Box>
            )}
        </Stack>
    );
}
