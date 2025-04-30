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
import {ConfigDatastreamConstant} from "@/app/_components/state-manager/Config";

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

// Functions that are reusable

export async function insertSystem(node: INode, systemJSON: any): Promise<string> {
    let ep: string = `${node.getConnectedSystemsEndpoint()}/systems/`;
    console.log("Inserting System: ", ep, JSON.stringify(systemJSON));

    const response = await fetch(ep, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(systemJSON),
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/sml+json'
        }
    });

    if (response.ok) {
        console.log("[CONFIG] Config System Inserted: ", response.headers.get("Location"));
        let sysId = response.headers.get("Location").split("/").pop();
        await insertDatastream(sysId, node);
        return sysId;
    } else {
        console.warn("Error inserting system: ", response);
    }
}

export async function insertDatastream(systemId: string, node: INode): Promise<string> {
    let ep: string = `${node.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams/`;
    console.log("Inserting Datastream: ", ep, node);

    console.log(JSON.stringify(ConfigDatastreamConstant))
    const response = await fetch(ep, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(ConfigDatastreamConstant),
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/json'
        }
    });

    if (response.ok) {
        console.log("Datastream Inserted Response: ", response);
        let dsId = response.headers.get("Location").split("/").pop();
        return dsId;
    } else {
        console.warn("Error inserting Datastream: ", response);
    }
}