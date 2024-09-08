/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// starts with lane, followed by 1 or more digits, ends after digit(s)
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {ISystem, System} from "@/lib/data/osh/Systems";
import {randomUUID} from "osh-js/source/core/utils/Utils";

const LANEREGEX = /^lane\d+$/;

let NODEID = 1;

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
    auth: { username: string, password: string } | null,
    isDefaultNode: boolean

    getConnectedSystemsEndpoint(): string,

    getBasicAuthHeader(): any,

    fetchSystems(): Promise<any>,

    fetchLanes(): Promise<{ systems: ISystem[]; lanes: LaneMeta[] }>,
}

export interface NodeOptions {
    name: string,
    address: string,
    port: number,
    oshPathRoot?: string,
    sosEndpoint?: string,
    csAPIEndpoint?: string,
    csAPIConfigEndpoint?: string,
    auth?: { username: string, password: string } | null,
    isSecure?: boolean,
    isDefaultNode?: boolean
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
    auth: { username: string, password: string } | null = null;
    isDefaultNode: boolean;

    constructor(options: NodeOptions) {
        this.id = "node-" + randomUUID();
        this.name = options.name;
        this.address = options.address;
        this.port = options.port;
        this.oshPathRoot = options.oshPathRoot || '/sensorhub';
        this.sosEndpoint = options.sosEndpoint || '/sos';
        this.csAPIEndpoint = options.csAPIEndpoint || '/api';
        this.csAPIConfigEndpoint = options.csAPIConfigEndpoint || '/configs';
        this.auth = options.auth || null;
        this.isSecure = options.isSecure || false;
        this.isDefaultNode = options.isDefaultNode || false;
    }

    // constructor(name: string, address: string, port: number = 8282, oshPathRoot: string = '/sensorhub', sosEndpoint: string = '/sos', csAPIEndpoint: string = '/api', csAPIConfigEndpoint: string = '/configs', auth: {
    //     username: string,
    //     password: string
    // } | null = {username: "admin", password: "admin"}, isSecure: boolean = false, isDefaultNode: boolean = false) {
    //     this.id = "node-" + randomUUID();
    //     this.name = name;
    //     this.address = address;
    //     this.port = port;
    //     this.oshPathRoot = oshPathRoot;
    //     this.sosEndpoint = sosEndpoint;
    //     this.csAPIEndpoint = csAPIEndpoint;
    //     this.csAPIConfigEndpoint = csAPIConfigEndpoint;
    //     this.auth = auth;
    //     this.isSecure = isSecure;
    //     this.isDefaultNode = isDefaultNode;
    // }

    getConnectedSystemsEndpoint() {
        let protocol = this.isSecure ? 'https' : 'http';
        return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
    }

    getConfigEndpoint() {
        let protocol = this.isSecure ? 'https' : 'http';
        return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIConfigEndpoint}`;
    }

    getBasicAuthHeader() {
        const encoded = btoa(`${this.auth.username}:${this.auth.password}`);
        return {"Authorization": `Basic ${encoded}`};
    }

    async fetchSystems(): Promise<any> {
        const response = await fetch(`${this.getConnectedSystemsEndpoint()}/systems`, {
            headers: {
                ...this.getBasicAuthHeader(),
            }
        });
        if (response.ok) {
            const data = await response.json();
            return data.items;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.getConnectedSystemsEndpoint()}`);
        }
    }

    async fetchConfig() {
        return
    }

    async fetchDataStreams() {
        // fetch data streams from the server with CSAPI
        const response = await fetch(`${this.getConnectedSystemsEndpoint()}/datastreams`, {
            headers: {
                ...this.getBasicAuthHeader()
            }
        });
        if (response.ok) {
            const data = await response.json();
            return data.items;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.getConnectedSystemsEndpoint()}`);
        }
    }

    async fetchLanes(): Promise<{ systems: ISystem[]; lanes: LaneMeta[] }> {
        let fetchedLanes: LaneMeta[] = [];
        let fetchedSystems: ISystem[] = [];
        // first, fetch the systems
        const systems_arr = await this.fetchSystems();
        console.log("Systems:", systems_arr);
        for (let system of systems_arr) {
            // console.log("System:", system);
            const newSystem = new System(system.id ,system.properties.uid, system.properties.name, this, null);
            // console.log("New System:", newSystem);
            fetchedSystems.push(newSystem);
            const uidSplit = system.properties.uid.split(":");
            // Test for lane signature in uid
            if (LANEREGEX.test(uidSplit[uidSplit.length - 1])) {
                // console.info("Found System matching lane signature");
                const newLaneName = system.properties.name;
                // Fetch subsystems
                const subsystems = await newSystem.fetchSubsystems();
                fetchedSystems.push(...subsystems);
                let systemIds = subsystems.map(subsystem => subsystem.id);
                systemIds.unshift(newSystem.id);
                // Create a new LaneMeta object
                let newLaneMeta = new LaneMeta(newLaneName, systemIds);
                // console.info("New Lane Created:", newLaneMeta);
                fetchedLanes.push(newLaneMeta);
            }
        }
        console.log("LaneFetched these objects:", fetchedLanes, fetchedSystems);
        return {lanes: fetchedLanes, systems: fetchedSystems};
    }

}
