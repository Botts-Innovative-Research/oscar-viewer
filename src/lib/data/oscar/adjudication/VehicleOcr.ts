/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {randomUUID} from "osh-js/source/core/utils/Utils";
import {OCR_PLATE_AUTOFILL_CONFIDENCE} from "@/lib/data/Constants";

export type VehicleIdType = "container" | "plate";

export interface IVehicleOcrResult {
    time: string;
    id: string;
    occupancyObsId: string;
    idType: VehicleIdType;
    value: string;
    normalizedValue: string;
    checksumValid: boolean;
    confidence: number;
    readCount: number;
    cameraUid: string;
    frameTime: string;
    evidenceImagePath: string;
}

/** One OCR candidate (container number or plate) published on a lane's vehicleOcr datastream. */
export default class VehicleOcrResult implements IVehicleOcrResult {
    time: string;
    id: string;
    occupancyObsId: string;
    idType: VehicleIdType;
    value: string;
    normalizedValue: string;
    checksumValid: boolean;
    confidence: number;
    readCount: number;
    cameraUid: string;
    frameTime: string;
    evidenceImagePath: string;

    constructor(time: string, observation: any) {
        this.time = time;
        this.id = randomUUID();
        this.occupancyObsId = observation?.occupancyObsId;
        this.idType = observation?.idType;
        this.value = observation?.value;
        this.normalizedValue = observation?.normalizedValue;
        this.checksumValid = Boolean(observation?.checksumValid);
        this.confidence = Number(observation?.confidence ?? 0);
        this.readCount = Number(observation?.readCount ?? 0);
        this.cameraUid = observation?.cameraUid;
        this.frameTime = observation?.frameTime;
        this.evidenceImagePath = observation?.evidenceImagePath;
    }
}

/**
 * Threshold-hybrid auto-fill rule shared by every adjudication surface:
 * auto-fill only when exactly one ID type has an eligible candidate and that
 * type reads as exactly one distinct value. A checksum-valid container is
 * always eligible; a plate is eligible only at/above the auto-fill confidence.
 * When both a container and a plate were read, never auto-choose — return
 * null so the operator picks from the suggestion chips.
 */
export function computeAutofill(results: IVehicleOcrResult[]): IVehicleOcrResult | null {
    const eligible = results.filter(result =>
        result.idType === "container"
            ? result.checksumValid
            : result.confidence >= OCR_PLATE_AUTOFILL_CONFIDENCE);

    if (eligible.length === 0) return null;

    const idTypes = new Set(eligible.map(result => result.idType));
    if (idTypes.size !== 1) return null;

    const values = new Set(eligible.map(result => result.normalizedValue));
    if (values.size !== 1) return null;

    return eligible.reduce((best, result) => (result.confidence > best.confidence ? result : best));
}

/** Deduplicates by (idType, normalizedValue), keeping the highest-confidence read. */
export function dedupeOcrResults(results: IVehicleOcrResult[]): IVehicleOcrResult[] {
    const byKey = new Map<string, IVehicleOcrResult>();
    for (const result of results) {
        const key = `${result.idType}:${result.normalizedValue}`;
        const existing = byKey.get(key);
        if (!existing || result.confidence > existing.confidence)
            byKey.set(key, result);
    }
    return Array.from(byKey.values())
        .sort((a, b) => Number(b.checksumValid) - Number(a.checksumValid) || b.confidence - a.confidence);
}
