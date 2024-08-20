/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// starts with lane, followed by 1 or more digits, ends after digit(s)
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {System} from "@/lib/data/osh/Systems";

const LANEREGEX = /^lane\d+$/;

export interface INode {
    id: number,
    name: string,
    address: string,
    port: number,
    oshPathRoot: string,
    sosEndpoint: string,
    csAPIEndpoint: string,
    csAPIConfigEndpoint: string,
    isSecure: boolean,

    getConnectedSystemsEndpoint(): string,

    getBasicAuthHeader(): any,

    fetchSystems(): Promise<any>,

    fetchLanes(): Promise<{ systems: System[]; lanes: LaneMeta[] }>,
}

export class Node implements INode {
    id: number;
    name: string;
    address: string;
    port: number;
    oshPathRoot: string;
    sosEndpoint: string;
    csAPIEndpoint: string;
    csAPIConfigEndpoint: string;
    isSecure: boolean;
    auth: { username: string, password: string } | null = null;

    constructor(id: number, name: string, address: string, port: number = 8282, oshPathRoot: string = '/sensorhub', sosEndpoint: string = '/sos', csAPIEndpoint: string = '/api', csAPIConfigEndpoint: string = '/configs', auth: {
        username: string,
        password: string
    } | null = {username: "admin", password: "admin"}, isSecure: boolean = false) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.port = port;
        this.oshPathRoot = oshPathRoot;
        this.sosEndpoint = sosEndpoint;
        this.csAPIEndpoint = csAPIEndpoint;
        this.csAPIConfigEndpoint = csAPIConfigEndpoint;
        this.auth = auth;
        this.isSecure = isSecure;
    }

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

    async fetchLanes(): Promise<{ systems: System[]; lanes: LaneMeta[] }> {
        let fetchedLanes: LaneMeta[] = [];
        let fetchedSystems: System[] = [];
        // first, fetch the systems
        const systems_arr = await this.fetchSystems();
        console.log("Systems:", systems_arr);
        for (let system of systems_arr) {
            console.log("System:", system);
            const newSystem = new System(system.id ,system.properties.uid, system.properties.name, this, null);
            console.log("New System:", newSystem);
            fetchedSystems.push(newSystem);
            const uidSplit = system.properties.uid.split(":");
            // Test for lane signature in uid
            if (LANEREGEX.test(uidSplit[uidSplit.length - 1])) {
                console.info("Found System matching lane signature");
                const newLaneName = system.properties.name;
                // Fetch subsystems
                const subsystems = await newSystem.fetchSubsystems();
                let systemIds = subsystems.map(subsystem => subsystem.id);
                systemIds.unshift(newSystem.id);
                // Create a new LaneMeta object
                let newLaneMeta = new LaneMeta(newLaneName, systemIds);
                fetchedLanes.push(newLaneMeta);
            }
        }
        console.log("LaneFetched these objects:", fetchedLanes, fetchedSystems);
        return {lanes: fetchedLanes, systems: fetchedSystems};
    }

}
