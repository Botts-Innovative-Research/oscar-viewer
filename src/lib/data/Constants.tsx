/*
 * Copyright (c) 2022-2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

import { INode } from "./osh/Node";

// Playback States========================================================
export enum PlaybackState {
    PLAY,
    PAUSE
}

// Observable Types ========================================================
export enum ObservableType {

    PLI = 'PLI',
    VIDEO = 'VIDEO',
    DRAPING = 'DRAPING',
}

export const DEFAULT_TIME_ID: string = "INDETERMINATE | REALTIME";
export const START_TIME: string = new Date().toISOString();
export const END_TIME: string = "...";
export const FUTURE_END_TIME: string = "2999-12-31T23:59:59.000Z";

export enum TimeScale {

    HOURS = "H",
    MINUTES = "M",
    SECONDS = "S"
}

export function asMillis(scale: TimeScale): number {

    let millis: number = 1000;

    switch(scale) {
        case TimeScale.HOURS:
            millis = 3600000;
            break;
        case TimeScale.MINUTES:
            millis = 60000;
            break;
        case TimeScale.SECONDS:
        default:
            break;
    }

    return millis;
}

export enum Service {
    API = "/sensorhub/api",
    SOS = "/sensorhub/sos",
    SPS = "/sensorhub/sps"
}

export const DEFAULT_SOS_ENDPOINT:Service = Service.SOS;
export const DEFAULT_SPS_ENDPOINT:Service = Service.SPS;
export const DEFAULT_API_ENDPOINT:Service = Service.API;

export enum Protocols {
    HTTP = "http",
    HTTPS = "https",
    WS = "ws",
    WSS = "wss"
}


export const SENSOR_LOCATION_DEF = "http://www.opengis.net/def/property/OGC/0/SensorLocation";
export const LOCATION_VECTOR_DEF = 'http://sensorml.com/ont/swe/property/LocationVector';
export const RASTER_IMAGE_DEF = "http://sensorml.com/ont/swe/property/RasterImage";
export const VIDEO_FRAME_DEF = "http://sensorml.com/ont/swe/property/VideoFrame";
export const ALARM_DEF = "http://www.opengis.net/def/Alarm";
export const GAMMA_COUNT_DEF = "http://www.opengis.net/def/GammaGrossCount";
export const NEUTRON_COUNT_DEF = "http://www.opengis.net/def/NeutronGrossCount";
export const TAMPER_STATUS_DEF = "http://www.opengis.net/def/TamperStatus";
export const OCCUPANCY_PILLAR_DEF = "http://www.opengis.net/def/PillarOccupancyCount";
export const CONNECTION_DEF ="http://www.opengis.net/def/ConnectionStatus";
export const THRESHOLD_DEF ="http://www.opengis.net/def/Threshold";
export const REPORT_DEF = "http://sensorml.com/ont/swe/property/ReportType";
export const ADJ_DEF = "http://sensorml.com/ont/swe/property";
export const SPEED_DEF = "http://www.opengis.net/def/SpeedTime";
export const CONFIG_DEF ="http://www.opengis.net/def/Config";
export const SITE_DIAGRAM_DEF ="http://sensorml.com/ont/swe/property/SiteDiagramPath";
