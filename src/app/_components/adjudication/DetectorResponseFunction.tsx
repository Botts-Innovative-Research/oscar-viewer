/*
 * Copyright (c) 2024. Botts Innovative Research, Inc.
 * All Rights Reserved
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface DetectorInfo {
    api_version: string;
    endpoint: string;
    allowed_detectors: string[];
}

export function DetectorResponseFunction() {
    const { t } = useLanguage();
    const [detectorInfo, setDetectorInfo] = useState<DetectorInfo | null>(null);

    useEffect(() => {
        // Secure Egress Mitigation: Use local config instead of external Sandia API
        fetch('/config/spectroscopy-info.json')
            .then(res => res.json())
            .then(data => setDetectorInfo(data))
            .catch(err => console.error(t('spectroscopicDataInvalid'), err));
    }, [t]);

    return (
        <div>
            {detectorInfo ? (
                <div>
                    Endpoint: {detectorInfo.endpoint}
                </div>
            ) : (
                <div>{t('loading')}</div>
            )}
        </div>
    );
}
