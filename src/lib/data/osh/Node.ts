/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// starts with lane, followed by 1 or more digits, ends after digit(s)
import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {System as OSCARSystem} from "@/lib/data/osh/Systems";
import {ISystem} from "@/lib/data/osh/Systems";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import Systems from "osh-js/source/core/sweapi/system/Systems.js";
import System from "osh-js/source/core/sweapi/system/System.js";
import SystemFilter from "osh-js/source/core/sweapi/system/SystemFilter.js";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {AdjudicationDatastreamConstant} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import DataStreamFilter from "osh-js/source/core/sweapi/datastream/DataStreamFilter.js";
import { isVideoDatastream } from "../oscar/Utilities";

const SYSTEM_UID_PREFIX = "urn:osh:system:";
const DATABASE_PROCESS_UID_PREFIX = "urn:osh:process:rapiscan:";

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
    laneAdjMap?: Map<string, string>

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean): string,

    getBasicAuthHeader(): any,

    fetchSystems(): Promise<any>,

    fetchLanes(): Promise<{ systems: ISystem[]; lanes: LaneMeta[] }>,

    fetchSystemsTK(): Promise<any[]>,

    fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>>,

    fetchDatastreamsTK(laneMap: Map<string, LaneMapEntry>): void,

    fetchProcessVideoDatastreams(laneMap: Map<string, LaneMapEntry>): void

    insertSubSystem(systemJSON: any, parentSystemId: string): Promise<string>

    insertAdjSystem(systemJSON: any): Promise<string>

    insertAdjDatastream(systemId: string): Promise<string>

    insertObservation(observationJSON: any, datastreamId: string): Promise<string>

    fetchControlStreams(): Promise<any>
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
    laneAdjMap?: Map<string, string>
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
    laneAdjMap: Map<string, string> = new Map<string, string>();

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

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean = false) {
        let protocol = this.isSecure ? 'https' : 'http';
        // return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
        console.log("NODE TEST GET CSAPI ENDPOINT", this);
        return noProtocolPrefix ? `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`
            : `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
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
            // Test for lane signature in uid
            if (system.properties.uid.includes(SYSTEM_UID_PREFIX)) {
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

        // check if node is reachable first
        let isReachable = OSHSliceWriterReader.checkForEndpoint(this);
        if (!isReachable) {
            console.warn("Node is not reachable, check endpoint properties");
            return new Map<string, LaneMapEntry>();
        }

        let systems = await this.fetchSystemsTK();
        let laneMap = new Map<string, LaneMapEntry>();
        console.log("TK Systems retrieved:", systems);

        // filter into lanes
        for (let system of systems) {
            // console.log("TK System:", system);
            if (system.properties.properties?.uid.includes(SYSTEM_UID_PREFIX) && !system.properties.properties?.uid.includes("adjudication")) {
                // console.log("TK Found lane system:", system);
                // let laneName = system.properties.properties.uid.split(":").pop();
                let laneName = system.properties.properties.name;

                if (laneMap.has(laneName)) {
                    laneMap.get(laneName).systems.push(system);
                    laneMap.get(laneName).setLaneSystem(system);
                } else {
                    let tLaneEntry = new LaneMapEntry(this);
                    tLaneEntry.setLaneName(laneName);
                    laneMap.set(laneName, tLaneEntry);
                    // console.log("TK LaneMap:", laneMap, laneName);
                    let entry = laneMap.get(laneName);
                    entry.addSystem(system);
                    entry.setLaneSystem(system);
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

    async fetchSystemsTK(): Promise<any[]> {
        let systemsApi = new Systems({
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`,
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
        for (const [, laneEntry] of laneMap) {
            try {
                const datastreams = await laneEntry.laneSystem.searchDataStreams(undefined, 100);
                while (datastreams.hasNext()) {
                    const datastreamResults = await datastreams.nextPage();
                    laneEntry.addDatastreams(datastreamResults);
                }
            } catch (error) {
                console.error(`Error fetching datastreams for system ${laneEntry.laneSystem.id}:`, error);
            }
        }
    }

    async fetchProcessVideoDatastreams(laneMap: Map<string, LaneMapEntry>) {

        // TODO: Check if "urn:osh:process:rapiscan:" exists as a system on node
        // TODO: Match video datastreams to process datastreams using "<systemUID>:<outputName>"
        // TODO: Add to list of datastreams

        const systems = await this.fetchSystemsTK();
        const databaseProcesses = systems.filter((system: any) => system.properties.properties.uid.includes(DATABASE_PROCESS_UID_PREFIX));

        const videoDsMap = new Map<typeof DataStream, string>(); // <ds, laneName>
        for(const [laneName, laneEntry] of laneMap) {
            const laneVideoStreams = laneEntry.datastreams.filter((ds) => isVideoDatastream(ds));
            laneVideoStreams.forEach((videoDatastream) => videoDsMap.set(videoDatastream, laneName));
        }

        let allProcessVideostreamsMap = new Map<string, typeof DataStream>(); // <outputName, ds>

        for(const process of databaseProcesses) {
            const datastreamSearch = await process.searchDataStreams(undefined, 100);
            while(datastreamSearch.hasNext()) {
                const datastreamPage = await datastreamSearch.nextPage();
                // find videostreams
                // add to lane ds list
                const videoDatastreams = datastreamPage.filter((datastream: typeof DataStream) => isVideoDatastream(datastream));
                videoDatastreams.forEach((videoDatastream: typeof DataStream) => allProcessVideostreamsMap.set(videoDatastream.properties.outputName, videoDatastream));
            }
        }
        console.log("All process streams");
        console.log(allProcessVideostreamsMap);
        console.log("All videos map: ");
        console.log(videoDsMap);

        for (const [videoDs, laneName] of videoDsMap) {
            const videoStreamUID = videoDs.properties["system@link"].uid;
            const videoStreamOutputName = videoDs.properties.outputName;
            const processVideoStreamOutputName = `${videoStreamUID}:${videoStreamOutputName}`;

            const processVideoDs = allProcessVideostreamsMap.get(processVideoStreamOutputName);
            console.log("Process Video Datastream: ", processVideoStreamOutputName);

            if(processVideoDs) {
                laneMap.get(laneName).addDatastreams([processVideoDs]);
                console.log("Added process video datastream to lane: ", laneName);
                console.log(laneMap);
            }
        }
    }

    fetchDatasourcesTK() {

    }

    // TODO: clean this up and verify that we aren't duplicating systems or outputs
    async fetchOrCreateAdjudicationSystems(laneMap: Map<string, LaneMapEntry>) {
        let systems: typeof System[] = await this.fetchSystemsTK();
        console.log("[ADJ] Fetching adjudication systems for node: ", this, laneMap);
        let adjSysAndDSMap: Map<string, string> = new Map();
        let laneAdjDsMap: Map<string, string> = new Map();

        for (const [laneName, laneEntry] of laneMap as Map<string, LaneMapEntry>) {
            let system = systems.find((sys: typeof System) => {
                return sys.properties.properties.uid.includes("adjudication")
            });
            // console.log("[ADJ-INSERT] systems check", system)
            if (system) {
                // console.log("[ADJ-INSERT] Found adjudication systems for lane: ", laneEntry, system);
                // check for datastreams
                let streamCollection: any = await system.searchDataStreams(new DataStreamFilter(), 1000);
                // if (datastreams.length > 0) {
                if (streamCollection.hasNext()) {
                    let datastreams = await streamCollection.nextPage();
                    console.log("[ADJ-INSERT] Found datastreams for adjudication system: ", datastreams);
                    adjSysAndDSMap.set(system.properties.id, datastreams[0].properties.id);
                    laneAdjDsMap.set(laneName, datastreams[0].properties.id);
                } else {
                    console.log("[ADJ-INSERT] No datastreams found for adjudication system: ", system);
                    let dsId = await this.insertAdjDatastream(system.id);
                    adjSysAndDSMap.set(system.properties.id, dsId);
                    laneAdjDsMap.set(laneName, dsId);
                }
            } else {
                console.log(`[ADJ-INSERT] No existing adjudication systems found, creating new system for lane" ${laneName}`);
                let sysId = await laneEntry.insertAdjudicationSystem(laneName);
                // insert datastreams
                let dsId = await this.insertAdjDatastream(sysId);
                adjSysAndDSMap.set(sysId, dsId);
                laneAdjDsMap.set(laneName, dsId);
            }
        }
        this.laneAdjMap = laneAdjDsMap;
        return adjSysAndDSMap;
    }

    async insertAdjSystem(systemJSON: any): Promise<string> {
        let ep: string = `${this.getConnectedSystemsEndpoint()}/systems/`;
        // console.log("[ADJ] Inserting Adjudication System: ", ep, this);

        const response = await fetch(ep, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(systemJSON),
            headers: {
                ...this.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            console.log("[ADJ] Adj System Inserted: ", response);
            let sysId = response.headers.get("Location").split("/").pop();
            return sysId;
        } else {
            console.warn("[ADJ] Error inserting Adj system: ", response);
        }
    }

    async insertAdjDatastream(systemId: string): Promise<string> {
        let ep: string = `${this.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams`;
        // console.log("[ADJ] Inserting Adjudication Datastream: ", ep, this);

        const response = await fetch(ep, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(AdjudicationDatastreamConstant),
            headers: {
                ...this.getBasicAuthHeader(),
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log("[ADJ] Adj Datastream Inserted: ", response);
            let dsId = response.headers.get("Location").split("/").pop();
            return dsId;
        } else {
            console.warn("[ADJ] Error inserting Adj Datastream: ", response);
        }
    }

    async insertObservation(observationJSON: any, datastreamId: string): Promise<string> {
        let ep: string = `${this.getConnectedSystemsEndpoint()}/datastreams/${datastreamId}/observations`;
        console.log("[ADJ] Inserting Observation: ", ep, this);

        const response = await fetch(ep, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(observationJSON),
            headers: {
                ...this.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            console.log("[NODE] Observation Inserted: ", response);
            let obsId = response.headers.get("Location").split("/").pop();
            return obsId;
        } else {
            console.warn("[Node] Error inserting Observation: ", response);
        }
    }

    insertSubSystem(systemJSON: any, parentSystemId: string): Promise<string> {
        return Promise.resolve("");
    }

    async fetchControlStreams() {
        // have to use manual request due to osh-js having the wrong resource location
        let ep = `${this.getConnectedSystemsEndpoint(false)}/controlstreams`
        let response = await fetch(ep, {
            method: "GET",
            headers: {
                ...this.getBasicAuthHeader(),
                "Content-Type": "application/json"
            }
        });
        if (response.ok) {
            let json = await response.json();
            console.log("Control Streams", json['items']);
            return json['items']
        } else {
            console.warn("Error getting Control Streams")
            return []
        }
    }
}