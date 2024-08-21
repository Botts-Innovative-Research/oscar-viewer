/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
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
    playbackMode: string

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

    constructor(id: string, name: string, parentSystemId: string, phenomenonTime: ITimePeriod | null, tls: boolean = false, playbackMode: string = 'real_time') {
        this.id = id;
        this.name = name;
        this.parentSystemId = parentSystemId;
        this.phenomenonTime = phenomenonTime;
        this.tls = tls;
        this.playbackMode = playbackMode;
    }

    equals(other: Datastream): boolean {
        return this.id === other.id;
    }

    generateSweApiObj(timeRange: { start: string, end: string } | null | undefined): SweApi {

        if (timeRange) {
            this.phenomenonTime.beginPosition = timeRange.start;
            this.phenomenonTime.endPosition = timeRange.end;
        }

        if (this.phenomenonTime.beginPosition === null || this.phenomenonTime.endPosition === null) {
            throw new Error('Phenomenon Time is not set, cannont create SWE API object');
        }

        let sweApi = new SweApi(`${this.id}-datastream`, {
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


export class DatastreamSet<IDatastream> extends Set<IDatastream>{
    // add(datastream: IDatastream): IDatastream {
    //     if()
    // }
}