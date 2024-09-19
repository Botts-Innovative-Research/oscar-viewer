/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// starts with lane, followed by 1 or more digits, ends after digit(s)
import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {ISystem, System} from "@/lib/data/osh/Systems";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import Systems from "osh-js/source/core/sweapi/system/Systems.js";
import SystemFilter from "osh-js/source/core/sweapi/system/SystemFilter.js";

const LANEREGEX = /^lane\d+$/;

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

    fetchSystemsTK(): void,

    fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>>,

    fetchDatastreamsTK(laneMap: Map<string, LaneMapEntry>): void,
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

    getConnectedSystemsEndpoint() {
        let protocol = this.isSecure ? 'https' : 'http';
        // return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
        return `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
    }

    getConfigEndpoint() {
        // let protocol = this.isSecure ? 'https' : 'http';
        return `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIConfigEndpoint}`;
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
            console.log("System:", system);
            const newSystem = new System(system.id, system.properties.uid, system.properties.name, this, null);
            console.log("New System:", newSystem);
            fetchedSystems.push(newSystem);
            const uidSplit = system.properties.uid.split(":");
            // Test for lane signature in uid
            if (LANEREGEX.test(uidSplit[uidSplit.length - 1])) {
                console.info("Found System matching lane signature");
                const newLaneName = system.properties.name;
                // Fetch subsystems
                const subsystems = await newSystem.fetchSubsystems();
                fetchedSystems.push(...subsystems);
                let systemIds = subsystems.map(subsystem => subsystem.id);
                systemIds.unshift(newSystem.id);
                // Create a new LaneMeta object
                let newLaneMeta = new LaneMeta(newLaneName, systemIds);
                console.info("New Lane Created:", newLaneMeta);
                fetchedLanes.push(newLaneMeta);
            }
        }
        console.log("LaneFetched these objects:", fetchedLanes, fetchedSystems);
        return {lanes: fetchedLanes, systems: fetchedSystems};
    }

    async fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>> {
        let systems = await this.fetchSystemsTK();
        let laneMap = new Map<string, LaneMapEntry>();
        console.log("TK Systems retrieved:", systems);

        // filter into lanes
        for (let system of systems) {
            // console.log("TK System:", system);
            if (system.properties.properties?.uid.includes("lane")) {
                // console.log("TK Found lane system:", system);
                // let laneName = system.properties.properties.uid.split(":").pop();
                let laneName = system.properties.properties.name;

                if (laneMap.has(laneName)) {
                    laneMap.get(laneName).systems.push(system);
                } else {
                    laneMap.set(laneName, new LaneMapEntry(this));
                    // console.log("TK LaneMap:", laneMap, laneName);
                    let entry = laneMap.get(laneName);
                    entry.addSystem(system);
                }

                let subsystems = await system.searchMembers();
                while (subsystems.hasNext()) {
                    let subsystemResults = await subsystems.nextPage();
                    laneMap.get(laneName).addSystems(subsystemResults);
                }
            }
        }

        return laneMap;
    }

    async fetchSystemsTK() {
        let systemsApi = new Systems({
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`,
            // endpointUrl: "192.168.1.158:8781/sensorhub/api",
            tls: this.isSecure,
            connectorOpts: this.auth
        });

        let searchedSystems = await systemsApi.searchSystems(new SystemFilter(), 100);
        let availableSystems = [];

        while (searchedSystems.hasNext()) {
            let systems = await searchedSystems.nextPage();
            availableSystems.push(...systems);
        }

        if (availableSystems.length > 0) {
            // console.log("Systems from TK:", availableSystems);
            return availableSystems;
        } else {
            throw new Error("No systems found, check endpoint properties");
        }
    }

    async fetchDatastreamsTK(laneMap: Map<string, LaneMapEntry>) {
        for (const [laneName, laneEntry] of laneMap) {
            for (let system of laneEntry.systems) {
                // console.log("TK DSSystem:", system);
                try {
                    const datastreams = await system.searchDataStreams(undefined, 100);
                    while (datastreams.hasNext()) {
                        const datastreamResults = await datastreams.nextPage();
                        // console.log("TK DatastreamResults:", datastreamResults);
                        laneEntry.addDatastreams(datastreamResults);
                    }
                    // console.log("TK Datastreams:", laneEntry.datastreams);
                } catch (error) {
                    console.error(`Error fetching datastreams for system ${system.id}:`, error);
                }
            }
        }
    }

    fetchDatasourcesTK() {

    }

}