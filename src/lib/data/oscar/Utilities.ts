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
    CONNECTION_DEF, GAMMA_COUNT_DEF, LOCATION_VECTOR_DEF, NATIONAL_DEF,
    NEUTRON_COUNT_DEF,
    OCCUPANCY_PILLAR_DEF, RASTER_IMAGE_DEF, REPORT_DEF, SENSOR_LOCATION_DEF,
    SITE_DIAGRAM_DEF, SPEED_DEF,
    TAMPER_STATUS_DEF,
    THRESHOLD_DEF, VIDEO_FRAME_DEF
} from "@/lib/data/Constants";


export function isLocationDatastream(datastream: typeof DataStream): boolean {
    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(SENSOR_LOCATION_DEF)
        || datastream.properties.observedProperties[0].definition.includes(LOCATION_VECTOR_DEF);
}

export function isVideoDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(RASTER_IMAGE_DEF)
    || datastream.properties.observedProperties[0].definition.includes(VIDEO_FRAME_DEF);
}

export function isGammaDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(ALARM_DEF)
        && datastream.properties.observedProperties[1].definition.includes(GAMMA_COUNT_DEF);
}

export function isNeutronDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(ALARM_DEF)
        && datastream.properties.observedProperties[1].definition.includes(NEUTRON_COUNT_DEF);
}

export function isTamperDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(TAMPER_STATUS_DEF);
}

export function isOccupancyDatastream(datastream: typeof DataStream): boolean {
    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(OCCUPANCY_PILLAR_DEF);
}

export function isConnectionDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(CONNECTION_DEF);
}

export function isSpeedDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(SPEED_DEF);
}

export function isThresholdDatastream(datastream: typeof DataStream): boolean {

    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(THRESHOLD_DEF);
}

export function isConfigurationDatastream(datastream: typeof DataStream): boolean {
    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.observedProperties[0].definition.includes(CONFIG_DEF);
}

export function isSiteDiagramPathDatastream(datastream: typeof DataStream): boolean {


    if (!hasDefinitionProperties(datastream))
        return false;

    return datastream.properties.controlledProperties[0].definition.includes(SITE_DIAGRAM_DEF);
}


export function isReportControlStream(controlStream: typeof ControlStream): boolean {

    if (!hasDefinitionProperties(controlStream))
        return false;

    return controlStream.properties.controlledProperties[0].definition.includes(REPORT_DEF);
}
export function isNationalControlStream(controlStream: typeof ControlStream): boolean {

    if (!hasDefinitionProperties(controlStream))
        return false;

    return controlStream.properties.controlledProperties[0].definition.includes(NATIONAL_DEF);
}

export function isAdjudicationControlStream(datastream: typeof DataStream): boolean {
    return datastream.properties.controlledProperties[0].definition.includes(ADJ_DEF);
}


export function hasDefinitionProperties(stream: typeof ConnectedSystemsApi){
    if (stream.properties.length == 0)
        return false;

    let definition = null;

    if (stream instanceof ControlStream)
        definition = stream.properties.controlledProperties[0].definition;
    else if (stream instanceof DataStream)
        definition = stream.properties.observedProperties[0].definition

    if (definition == undefined)
        return false;

    return true;
}