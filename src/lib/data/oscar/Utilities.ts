/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import ConnectedSystemsApi from "osh-js/source/core/consysapi/ConnectedSystemsApi";
import {
    ADJ_DEF,
    ALARM_DEF, CONFIG_DEF,
    CONNECTION_DEF, DOSE_DEF, DURATION_DEF, END_DEF, GAMMA_COUNT_DEF, HLS_VIDEO_DEF,
    LINEARSPEC_DEF, LOCATION_VECTOR_DEF, NATIONAL_DEF,
    NEUTRON_COUNT_DEF,
    OCCUPANCY_PILLAR_DEF, RASTER_IMAGE_DEF, N42_DEF, REPORT_DEF, SENSOR_LOCATION_DEF,
    SITE_DIAGRAM_DEF, SPEED_DEF, START_DEF,
    TAMPER_STATUS_DEF,
    THRESHOLD_DEF, VIDEO_FRAME_DEF, WEB_ID_DEF
} from "@/lib/data/Constants";

function getPropertyDefinitions(stream: typeof ConnectedSystemsApi, propertyName: "observedProperties" | "controlledProperties"): string[] {
    const properties = stream?.properties?.[propertyName];
    if (!Array.isArray(properties))
        return [];

    return properties
        .map((property: any) => property?.definition)
        .filter((definition: unknown): definition is string => typeof definition === "string");
}

function getObservedDefinitions(datastream: typeof DataStream): string[] {
    return getPropertyDefinitions(datastream, "observedProperties");
}

function getControlledDefinitions(controlStream: typeof ControlStream): string[] {
    return getPropertyDefinitions(controlStream, "controlledProperties");
}

function includesDefinition(definitions: string[], expected: string): boolean {
    return definitions.some((definition) => definition.includes(expected));
}


export function isLocationDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, SENSOR_LOCATION_DEF)
        || includesDefinition(definitions, LOCATION_VECTOR_DEF);
}

export function isVideoDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, RASTER_IMAGE_DEF)
        || includesDefinition(definitions, VIDEO_FRAME_DEF);
}

export function isGammaDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, ALARM_DEF)
        && includesDefinition(definitions, GAMMA_COUNT_DEF);
}

export function isNeutronDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, ALARM_DEF)
        && includesDefinition(definitions, NEUTRON_COUNT_DEF);
}

export function isTamperDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), TAMPER_STATUS_DEF);
}

export function isOccupancyDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), OCCUPANCY_PILLAR_DEF);
}

export function isConnectionDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), CONNECTION_DEF);
}

export function isSpeedDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), SPEED_DEF);
}

export function isForegroundDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, DURATION_DEF)
        && includesDefinition(definitions, LINEARSPEC_DEF)
        && includesDefinition(definitions, DOSE_DEF);
}
export function isBackgroundDataStream(datastream: typeof DataStream): boolean {
    const definitions = getObservedDefinitions(datastream);
    return includesDefinition(definitions, DURATION_DEF)
        && includesDefinition(definitions, LINEARSPEC_DEF)
        && !includesDefinition(definitions, DOSE_DEF);
}

export function isRs350DataStream(datastream: typeof DataStream): boolean {
    return isForegroundDataStream(datastream);
}
export function isThresholdDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), THRESHOLD_DEF);
}

export function isConfigurationDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), CONFIG_DEF);
}

export function isSiteDiagramPathDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), SITE_DIAGRAM_DEF);
}


export function isReportControlStream(controlStream: typeof ControlStream): boolean {
    return includesDefinition(getControlledDefinitions(controlStream), REPORT_DEF);
}
export function isNationalControlStream(controlStream: typeof ControlStream): boolean {
    const definitions = getControlledDefinitions(controlStream);
    return includesDefinition(definitions, START_DEF)
        && includesDefinition(definitions, END_DEF)
        && definitions.length === 2;
}

export function isAdjudicationControlStream(controlStream: typeof ControlStream): boolean {
    return includesDefinition(getControlledDefinitions(controlStream), ADJ_DEF);
}

export function isWebIdAnalysisDataStream(datastream: typeof DataStream): boolean {
    return includesDefinition(getObservedDefinitions(datastream), WEB_ID_DEF);
}

export function isHLSVideoControlStream(controlStream: typeof ControlStream): boolean {
    return includesDefinition(getControlledDefinitions(controlStream), HLS_VIDEO_DEF);
}


export function hasDefinitionProperties(stream: typeof ConnectedSystemsApi){
    return getObservedDefinitions(stream as typeof DataStream).length > 0
        || getControlledDefinitions(stream as typeof ControlStream).length > 0;
}
