/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

export interface INode {
    id: string,
    name: string,
    address: string,
    port: number,
    oshPathRoot: string,
    sosEndpoint: string,
    csAPIEndpoint: string,
    csAPIConfigEndpoint: string,
    isSecure: boolean,
    getConnectedSystemsEndpoint(): string,
}

export class Node implements INode {
    id: string;
    name: string;
    address: string;
    port: number;
    oshPathRoot: string;
    sosEndpoint: string;
    csAPIEndpoint: string;
    csAPIConfigEndpoint: string;
    isSecure: boolean;

    constructor(id: string, name: string, address: string, port: number = 8282, oshPathRoot: string = '/sensorhub', sosEndpoint: string = '/sos', csAPIEndpoint: string = '/api', csAPIConfigEndpoint: string = '/config', isSecure: boolean = false) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.port = port;
        this.oshPathRoot = oshPathRoot;
        this.sosEndpoint = sosEndpoint;
        this.csAPIEndpoint = csAPIEndpoint;
        this.csAPIConfigEndpoint = csAPIConfigEndpoint;
        this.isSecure = isSecure;
    }

    getConnectedSystemsEndpoint() {
        let protocol = this.isSecure ? 'https' : 'http';
        return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
    }

    async fetchSystems() {
        const response = await fetch(`${this.getConnectedSystemsEndpoint()}/systems`);
        if (response.ok) {
            const data = response.json();
            return data;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.getConnectedSystemsEndpoint()}`);
        }
    }

    async fetchDataStreams() {
        // fetch data streams from the server with CSAPI
        const response = await fetch(`${this.getConnectedSystemsEndpoint()}/datastreams`);
        if (response.ok) {
            const data = response.json();
            return data;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.getConnectedSystemsEndpoint()}`);
        }
    }

}
