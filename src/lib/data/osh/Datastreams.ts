/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


// @ts-ignore
import ConSysApi from "osh-js/source/core/datasource/ConSysApi/ConSysApi.datasource";
// @ts-ignore
import {ITimePeriod} from "@/app/data/Models";

export interface IDatastream {
    id: string,
    // uid: string,
    name: string,
    parentSystemId: string | null,
    endpointUrl: string,
    phenomenonTime: ITimePeriod,
    tls: boolean,
    playbackMode: string,
    datasource: typeof ConSysApi | null,

    equals(other: Datastream): boolean;
    checkIfInObsProperties(propName: string): Promise<boolean>;
}

export class Datastream implements IDatastream {
    id: string;
    // uid: string;
    name: string;
    parentSystemId: string;
    endpointUrl: string;
    phenomenonTime: ITimePeriod | null;
    tls: boolean = false;
    playbackMode: string;
    datasource: typeof ConSysApi | null = null;
    connectorOpts: { username:string, password:string };

    constructor(id: string, name: string, parentSystemId: string, phenomenonTime: ITimePeriod | null, tls: boolean = false, playbackMode: string = 'realTime') {
        this.id = id;
        this.name = name;
        this.parentSystemId = parentSystemId;
        this.phenomenonTime = phenomenonTime;
        this.tls = tls;
        this.playbackMode = playbackMode;

        // Get from node
        this.endpointUrl = "162.238.96.81:8781/sensorhub/api"
        this.connectorOpts = { username: 'admin', password: 'password' }
    }

    equals(other: Datastream): boolean {
        return this.id === other.id;
    }

    generateConSysApiObj(timeRange: { start: string, end: string } | null | undefined): typeof ConSysApi {

        if (timeRange) {
            this.phenomenonTime.beginPosition = timeRange.start;
            this.phenomenonTime.endPosition = timeRange.end;
        }

        if (this.phenomenonTime.beginPosition === null || this.phenomenonTime.endPosition === null) {
            throw new Error('Phenomenon Time is not set, cannont create SWE API object');
        }

        let ConSysApi = new ConSysApi(`${this.id}-datastream`, {
            protocol: this.getProtocol(),
            endpointUrl: this.endpointUrl,
            connectorOpts: this.connectorOpts,
            resource: `datastreams/${this.id}/observations`,
            startTime: this.phenomenonTime.beginPosition,
            endTime: this.phenomenonTime.endPosition,
            tls: this.tls,
            responseFormat: "application/swe+json",
            mode: this.playbackMode
        });

        this.datasource = ConSysApi;
        return ConSysApi;
    }

    // TODO: get
    getProtocol(): string {
        return this.tls ? 'wss' : 'ws';
    }

    async checkIfInObsProperties(propName: string): Promise<boolean> {
        let resp = await fetch(this.endpointUrl + `/datastreams/${this.id}/schema?f=application/json&obsFormat=application/om+json`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/om+json'
            }
        });
        const resultJson = await resp.json();
        return resultJson.resultSchema.label === propName;
    }
}

