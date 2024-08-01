/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {ITimePeriod} from "@/app/data/Models";

export interface IDatastream {
    id: string,
    uid: string,
    name: string,
    parentSystemId: string | null,
    endpointUrl: string,
    phenomenonTime: ITimePeriod,
    tls: boolean,
    playbackMode: string
}

export class Datastream implements IDatastream {
    id: string;
    uid: string;
    name: string;
    parentSystemId: string | null;
    endpointUrl: string;
    phenomenonTime: ITimePeriod;
    tls: boolean = false;
    playbackMode: string;

    constructor(id: string, uid: string, name: string, parentSystemId: string | null, endpointUrl: string, phenomenonTime: ITimePeriod, tls: boolean = false, playbackMode: string = 'real_time') {
        this.id = id;
        this.uid = uid;
        this.name = name;
        this.parentSystemId = parentSystemId;
        this.endpointUrl = endpointUrl;
        this.phenomenonTime = phenomenonTime;
        this.tls = tls;
        this.playbackMode = playbackMode;
    }

    generateSweApiObj(): SweApi {
        let sweApi = new SweApi(`${this.id}-datastream`,{
            protocol: this.getProtocol(),
            endpointUrl: this.endpointUrl,
            resource: `datastreams/${this.id}/observations`,
            startTime: this.phenomenonTime.beginPosition,
            endTime: this.phenomenonTime.endPosition,
            tls: this.tls,
            responseFormat: "application/swe+json",
            mode: this.playbackMode
        });

        return sweApi;
    }

    // TODO: get
    getProtocol(): string {
        return this.tls ? 'wss' : 'ws';
    }
}
