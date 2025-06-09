/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// starts with lane, followed by 1 or more digits, ends after digit(s)
import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {AdjudicationDatastreamConstant} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter.js";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import { isVideoDatastream } from "../oscar/Utilities";
import System from "osh-js/source/core/sweapi/system/System.js";
import Systems from "osh-js/source/core/consysapi/system/Systems.js";
import SystemFilter from "osh-js/source/core/consysapi/system/SystemFilter.js";
import { ISystem } from "./Systems";
const SYSTEM_UID_PREFIX = "urn:osh:system:";
const DATABASE_PROCESS_UID_PREFIX = "urn:osh:process:occupancy:";

export interface INode {
    id: string,
    name: string,
    address: string,
    port: number,
    oshPathRoot: string,
    sosEndpoint: string,
    csAPIEndpoint: string,
    configsEndpoint: string,
    isSecure: boolean,
    auth: { username: string, password: string } | null,
    isDefaultNode: boolean
    laneAdjMap?: Map<string, string>

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean): string,

    getConfigEndpoint(noProtocolPrefix: boolean): string,

    getConfigEndpoint() : string,

    getBasicAuthHeader(): any,

    fetchLanes(): Promise<{ systems: typeof System[]; lanes: LaneMeta[] }>,

    fetchSystems(): Promise<any[]>,

    fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>>,

    fetchDatastreams(laneMap: Map<string, LaneMapEntry>): void,

    fetchControlStreams(laneMap: Map<string, LaneMapEntry>): Promise<any>,

    fetchProcessVideoDatastreams(laneMap: Map<string, LaneMapEntry>): void,

    insertSubSystem(systemJSON: any, parentSystemId: string): Promise<string>

    insertSystem(systemJSON: any, endpoint: string): Promise<string>

    insertDatastream( endPoint: string, datastreamConstant: any): Promise<string>

    checkForEndpoint(): Promise<boolean>

    getDataStreamsApi(): typeof DataStreams

    getSystemsApi(): typeof Systems

}

export interface NodeOptions {
    name: string,
    address: string,
    port: number,
    oshPathRoot?: string,
    sosEndpoint?: string,
    csAPIEndpoint?: string,
    configsEndpoint?: string,
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
    configsEndpoint: string;
    isSecure: boolean;
    auth: { username: string, password: string } | null = null;
    isDefaultNode: boolean;
    laneAdjMap: Map<string, string> = new Map<string, string>();
    dataStreamsApi: typeof DataStreams;
    systemsApi: typeof Systems

    constructor(options: NodeOptions) {
        this.id = "node-" + randomUUID();
        this.name = options.name;
        this.address = options.address;
        this.port = options.port;
        this.oshPathRoot = options.oshPathRoot || '/sensorhub';
        this.sosEndpoint = options.sosEndpoint || '/sos';
        this.csAPIEndpoint = options.csAPIEndpoint || '/api';
        this.configsEndpoint = options.configsEndpoint || '/configs';
        this.auth = options.auth || null;
        this.isSecure = options.isSecure || false;
        this.isDefaultNode = options.isDefaultNode || false;


        let apiConfig = {
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`,
            tls: this.isSecure,
            connectorOpts:{
                username: this.auth.username,
                password: this.auth.password
            }
        }

        this.dataStreamsApi = new DataStreams(apiConfig);
        this.systemsApi = new Systems(apiConfig);

    }

    getSystemsApi(): typeof Systems{
        return this.systemsApi;
    }
    getDataStreamsApi(): typeof DataStreams {
        return this.dataStreamsApi;
    }

    setSystemsApi(apiConfig: string): typeof Systems{
        return new Systems(apiConfig)
    }

    setDataStreamsApi(apiConfig: string): typeof DataStreams {
        return new DataStreams(apiConfig);
    }

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean = false) {
        let protocol = this.isSecure ? 'https' : 'http';
        // return `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
        console.log("NODE TEST GET CSAPI ENDPOINT", this);
        return noProtocolPrefix ? `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`
            : `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
    }

    getConfigEndpoint(noProtocolPrefix: boolean = false) {
        let protocol = this.isSecure ? 'https' : 'http';
        console.log("NODE TEST GET CSAPI ENDPOINT", this);
        return noProtocolPrefix ? `${this.address}:${this.port}${this.oshPathRoot}${this.configsEndpoint}`
            : `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.configsEndpoint}`;
    }

    getBasicAuthHeader() {
        const encoded = btoa(`${this.auth.username}:${this.auth.password}`);
        return {"Authorization": `Basic ${encoded}`};
    }

    async fetchConfig() {
        return
    }

    async fetchLanes(): Promise<{ systems: typeof System[]; lanes: LaneMeta[] }> {
        let fetchedLanes: LaneMeta[] = [];
        let fetchedSystems: ISystem[] = [];
        // first, fetch the systems
        const systems_arr = await this.fetchSystems();
        console.log("Systems:", systems_arr);
        for (let system of systems_arr) {

            console.log("OUR System:", system);
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
                let systemIds = subsystems.map((subsystem: any) => subsystem.id);
                systemIds.unshift(newSystem.id);
                // Create a new LaneMeta object
                let newLaneMeta = new LaneMeta(newLaneName, systemIds);
                console.info("New Lane Created:", newLaneMeta);
                fetchedLanes.push(newLaneMeta);
            }
        }
        console.log("LaneFetched these objects:", fetchedLanes, fetchedSystems);
        return {lanes: null, systems: systems_arr};
    }


    async checkForEndpoint() {
        let ep: string = `${this.getConnectedSystemsEndpoint()}`;
        console.log("Checking for API endpoint: ", ep, this);

        const response = await fetch(ep, {
            method: 'GET',
            mode: 'cors',
            headers: {
                ...this.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            console.log("API Endpoint found: ", response);
            return true;
        } else {
            console.warn("Error checking for API endpoint: ", response);
            return false;
        }
    }

    async fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>> {

        // check if node is reachable first
        // let isReachable = OSHSliceWriterReader.checkForEndpoint(this);
        const isReachable = await this.checkForEndpoint();

        if (!isReachable) {
            console.warn("Node is not reachable, check endpoint properties");
            return new Map<string, LaneMapEntry>();
        }

        let systems = await this.fetchSystems();
        if(!systems || systems.length == 0) return;

        let laneMap = new Map<string, LaneMapEntry>();
        console.log("Systems retrieved:", systems);

        // filter into lanes
        for (let system of systems) {
            if (system.properties.properties?.uid.includes(SYSTEM_UID_PREFIX) && !system.properties.properties?.uid.includes("adjudication")) {
                let laneName = system.properties.properties.name;

                if (laneMap.has(laneName)) {
                    laneMap.get(laneName).systems.push(system);
                    laneMap.get(laneName).setLaneSystem(system);
                } else {
                    let tLaneEntry = new LaneMapEntry(this);
                    tLaneEntry.setLaneName(laneName);
                    laneMap.set(laneName, tLaneEntry);
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

    async fetchSystems(): Promise<any[]> {
        let systemsApi = this.getSystemsApi();

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
            console.warn("No systems found, check endpoint properties for: ", this.address);
        }
    }

    async fetchDatastreams(laneMap: Map<string, LaneMapEntry>) {
        for (const [, laneEntry] of laneMap) {
            if(laneEntry.parentNode.id != this.id) continue;
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

    async fetchControlStreams(laneMap: Map<string, LaneMapEntry>){
        for (const [, laneEntry] of laneMap) {

            if(laneEntry.parentNode.id != this.id) continue;
            try {
                const controlStreamCollection = await laneEntry.laneSystem.searchControlStreams(undefined, 100);
                while (controlStreamCollection.hasNext()) {
                    const controlStreamResults = await controlStreamCollection.nextPage();
                    laneEntry.addControlStreams(controlStreamResults);

                }
            } catch (error) {
                console.error(`Error fetching control streams for system ${laneEntry.laneSystem.id}:`, error);
            }
        }
    }

    async fetchProcessVideoDatastreams(laneMap: Map<string, LaneMapEntry>) {

        const systems = await this.fetchSystems();
        const databaseProcesses = systems.filter((system: any) => system.properties.properties.uid.includes(DATABASE_PROCESS_UID_PREFIX));

        const videoDsMap = new Map<typeof DataStream, string>(); // <ds, laneName>
        for(const [laneName, laneEntry] of laneMap) {
            if(laneEntry.parentNode.id != this.id) continue;
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

        for (const [videoDs, laneName] of videoDsMap) {
            const videoStreamUID = videoDs.properties["system@link"].uid;
            const videoStreamOutputName = videoDs.properties.outputName;
            const processVideoStreamOutputName = `${videoStreamUID}:${videoStreamOutputName}`;

            const processVideoDs = allProcessVideostreamsMap.get(processVideoStreamOutputName);

            if(processVideoDs) {
                laneMap.get(laneName).addDatastreams([processVideoDs]);
            }
        }
    }

    // TODO: clean this up and verify that we aren't duplicating systems or outputs
    async fetchOrCreateAdjudicationSystems(laneMap: Map<string, LaneMapEntry>) {
        let systems: typeof System[] = await this.fetchSystems();

        if(!systems) return;

        console.log("[ADJ] Fetching systems for node: ", this, laneMap, systems);
        let adjSysAndDSMap: Map<string, string> = new Map();
        let laneAdjDsMap: Map<string, string> = new Map();


        for (const [laneName, laneEntry] of laneMap as Map<string, LaneMapEntry>) {

            if(laneEntry.parentNode.id != this.id) continue;

            let system = systems.find((sys: typeof System) => {
                return sys.properties.properties.uid.includes("adjudication")
            });

            console.log("[ADJ-INSERT] systems check", system)
            if (system) {
                // console.log("[ADJ-INSERT] Found adjudication systems for lane: ", laneEntry, system);
                // check for datastreams
                let streamCollection: any = await system.searchDataStreams(new DataStreamFilter(), 1000);

                console.log("stream collection:", streamCollection)
                // if (datastreams.length > 0) {
                if (streamCollection.hasNext()) {
                    let datastreams = await streamCollection.nextPage();
                    if (datastreams.length > 0) {
                        console.log("[ADJ-INSERT] Found datastreams for adjudication system: ", datastreams);
                        adjSysAndDSMap.set(system.properties.id, datastreams[0].properties.id);
                        laneAdjDsMap.set(laneName, datastreams[0].properties.id);
                    } else {
                        console.log("[ADJ-INSERT] No datastreams found for adjudication system: ", system);

                        let ep: string = `${this.getConnectedSystemsEndpoint()}/systems/${system.properties.id}/datastreams/`;
                        let dsId = await this.insertDatastream(ep, AdjudicationDatastreamConstant);
                        adjSysAndDSMap.set(system.properties.id, dsId);
                        laneAdjDsMap.set(laneName, dsId);
                    }
                }
            } else {
                console.log(`[ADJ-INSERT] No existing adjudication systems found, creating new system for lane" ${laneName}`);
                let sysId = await laneEntry.insertAdjudicationSystem(laneName);

                // insert datastreams
                let ep: string = `${this.getConnectedSystemsEndpoint()}/systems/${sysId}/datastreams/`;
                let dsId = await this.insertDatastream(ep, AdjudicationDatastreamConstant);
                adjSysAndDSMap.set(sysId, dsId);
                laneAdjDsMap.set(laneName, dsId);
            }
        }
        this.laneAdjMap = laneAdjDsMap;
        return adjSysAndDSMap;
    }


    async insertSystem(systemJSON: any, ep: string): Promise<string> {
        console.log("Inserting System: ", ep, JSON.stringify(systemJSON));

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
            console.log("System Inserted: ", response.headers.get("Location"));
            let sysId = response.headers.get("Location").split("/").pop();

            return sysId;
        } else {
            console.warn("Error inserting system: ", response);
        }
    }

    async insertDatastream(endpoint: string, datastreamConstant: any): Promise<string> {
        console.log("Inserting Datastream: ", endpoint, this);

        console.log(JSON.stringify(datastreamConstant))
        const response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(datastreamConstant),
            headers: {
                ...this.getBasicAuthHeader(),
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


    insertSubSystem(systemJSON: any, parentSystemId: string): Promise<string> {
        return Promise.resolve("");
    }

}


export async function insertObservation(ep: any, observation: any, ){
    console.log("inserting observation: ", observation)
    let resp = await fetch(ep, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: observation,
        mode: "cors"
    });

    return resp;
}