"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import React, {useCallback, useContext, useEffect, useState} from "react";
import {Avatar, Box, Chip, Stack, Tooltip, Typography} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {OCR_DEF} from "@/lib/data/Constants";
import {EventType} from "osh-js/source/core/event/EventType";
import VehicleOcrResult, {dedupeOcrResults, IVehicleOcrResult} from "@/lib/data/oscar/adjudication/VehicleOcr";
import {isValidIso6346} from "@/lib/data/oscar/adjudication/Iso6346";
import {useLanguage} from "@/app/contexts/LanguageContext";

/**
 * Camera-OCR vehicle ID suggestions for one occupancy: chips the operator can
 * click to fill the vehicleId field. Renders nothing when the lane has no
 * vehicleOcr datastream (OCR not enabled at this site/lane) or no results
 * exist for this occupancy, so non-OCR sites see an unchanged form.
 * Follows the WebIdAnalysis fetch + realtime-subscribe pattern.
 */
export default function VehicleIdOcr(props: {
    event: EventTableData;
    appliedValue?: string;
    onApply: (value: string) => void;
    onOcrResults?: (results: IVehicleOcrResult[]) => void;
}) {
    const laneMapRef = useContext(DataSourceContext).laneMapRef;
    const {t} = useLanguage();

    const [ocrLog, setOcrLog] = useState<IVehicleOcrResult[]>([]);
    const [liveResults, setLiveResults] = useState<IVehicleOcrResult[]>([]);

    const getLaneEntry = useCallback((): LaneMapEntry | null => {
        if (!props.event?.laneId || !laneMapRef.current) return null;
        return laneMapRef.current.get(props.event.laneId) ?? null;
    }, [props.event]);

    const fetchData = useCallback(async () => {
        const laneEntry = getLaneEntry();
        if (!laneEntry) return;

        const ocrDatastream: typeof DataStream = laneEntry.findDataStreamByObsProperty(OCR_DEF);
        if (!ocrDatastream) return; // OCR not enabled on this lane

        let query = await ocrDatastream.searchObservations(undefined, 100);
        while (query.hasNext()) {
            const obsCollection = await query.nextPage();
            const results = obsCollection.map((obs: any) => new VehicleOcrResult(obs.resultTime, obs.result));
            setOcrLog(results);
        }
    }, [props.event]);

    useEffect(() => {
        if (props.event)
            fetchData();
    }, [props.event]);

    // realtime: an alarm's OCR result typically lands a few seconds after the
    // form opens, so subscribe while this occupancy is on screen
    useEffect(() => {
        const laneEntry = getLaneEntry();
        if (!laneEntry) return;

        const ocrStream = laneEntry.findDataStreamByObsProperty(OCR_DEF);
        if (!ocrStream) return;

        const ocrSource = laneEntry.datasourcesRealtime?.find((ds: any) => {
            const parts = ds.properties.resource?.split("/");
            return parts && parts[2] === ocrStream.properties.id;
        });
        if (!ocrSource) return;

        const handleObservations = (msg: any) => {
            const data = msg.values?.[0]?.data;
            if (!data) return;

            const result = new VehicleOcrResult(data.timestamp, data);
            if (result.occupancyObsId !== props.event.occupancyObsId) return;

            setLiveResults(prev => [result, ...prev]);
        };

        ocrSource.subscribe(handleObservations, [EventType.DATA]);
        try {
            ocrSource.connect();
        } catch (err) {
            console.error("Error connecting vehicleOcr source:", err);
        }
    }, [props.event]);

    const results = dedupeOcrResults([
        ...liveResults,
        ...ocrLog.filter(result => result?.occupancyObsId === props.event?.occupancyObsId),
    ]);

    useEffect(() => {
        if (props.onOcrResults)
            props.onOcrResults(results);
    }, [ocrLog, liveResults]);

    if (results.length === 0) return null;

    const laneEntry = getLaneEntry();
    const node = laneEntry?.parentNode;
    const bucketUrl = (path: string) => node && path
        ? `${node.isSecure ? "https" : "http"}://${node.address}:${node.port}${node.oshPathRoot}/buckets/${path}`
        : undefined;

    return (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">{t('ocrSuggestions')}:</Typography>
            {results.map(result => {
                const validated = result.checksumValid || isValidIso6346(result.normalizedValue);
                const crop = bucketUrl(result.evidenceImagePath);
                const applied = props.appliedValue === result.normalizedValue;
                return (
                    <Tooltip
                        key={`${result.idType}-${result.normalizedValue}`}
                        title={
                            <Box sx={{p: 0.5}}>
                                {crop && <img src={crop} alt={result.normalizedValue} style={{maxWidth: 280, display: 'block', marginBottom: 4}}/>}
                                <Typography variant="caption" display="block">
                                    {result.idType === 'container' ? t('ocrContainerNumber') : t('ocrLicensePlate')}
                                    {validated ? ` — ${t('ocrChecksumValid')}` : ''}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    {Math.round(result.confidence * 100)}% · {result.readCount}x · {result.cameraUid}
                                </Typography>
                                <Typography variant="caption" display="block">{t('ocrApplySuggestion')}</Typography>
                            </Box>
                        }
                    >
                        <Chip
                            avatar={crop
                                ? <Avatar variant="rounded" src={crop}/>
                                : <Avatar>{result.idType === 'container' ? <DirectionsBoatIcon fontSize="small"/> : <DirectionsCarIcon fontSize="small"/>}</Avatar>}
                            label={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <span>{`${result.normalizedValue} · ${Math.round(result.confidence * 100)}%`}</span>
                                    {validated && <CheckCircleIcon color="success" sx={{fontSize: 16}}/>}
                                </Stack>
                            }
                            variant={applied ? "filled" : "outlined"}
                            color={applied ? "primary" : "default"}
                            onClick={() => props.onApply(result.normalizedValue)}
                            data-testid="ocr-suggestion-chip"
                        />
                    </Tooltip>
                );
            })}
        </Stack>
    );
}
