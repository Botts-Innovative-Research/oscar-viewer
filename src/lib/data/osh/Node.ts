/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter.js";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import System from "osh-js/source/core/consysapi/system/System.js";
import Systems from "osh-js/source/core/consysapi/system/Systems.js";
import Observations from "osh-js/source/core/consysapi/observation/Observations.js"
import SystemFilter from "osh-js/source/core/consysapi/system/SystemFilter.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ControlStreams from "osh-js/source/core/consysapi/controlstream/ControlStreams"
import {ISystem} from "@/lib/data/osh/Systems";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import { hashString } from "@/app/utils/Utils";
import {LatLngExpression} from "leaflet";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";

const SYSTEM_UID_PREFIX = "urn:osh:system:";

export interface INode {
    id: string,
    name: string,
    address: string,
    port: number,
    oshPathRoot: string,
    csAPIEndpoint: string,
    bucketsEndpoint: string,
    isSecure: boolean,
    auth: { username: string, password: string } | null,
    isDefaultNode: boolean
    laneAdjMap?: Map<string, string>,
    oscarServiceSystem: any;
    siteMapPath: string;
    lowerLeftBound: LatLngExpression;
    upperRightBound: LatLngExpression;

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean): string,

    getBasicAuthHeader(): any,

    fetchSystems(): Promise<any[]>,

    fetchDataStreams(laneMap: Map<string, LaneMapEntry>): void,

    fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>>,

    fetchLaneControlStreams(laneMap: Map<string, LaneMapEntry>): Promise<any>,

    fetchNodeControlStreams(): Promise<any>,

    fetchNodeDataStreams(): Promise<any>,

    checkForEndpoint(): Promise<boolean>

    getOscarServiceSystem(): typeof System

    fetchDataStream(system: typeof System): Promise<any[]>

    fetchObservationsWithFilter(observationFilter: typeof ObservationFilter): Promise<any[]>

    fetchLatestObservationWithFilter(observationFilter: typeof ObservationFilter): Promise<any[]>

    getDataStreamsApi(): typeof DataStreams

    getSystemsApi(): typeof Systems

    getControlStreamApi(): typeof ControlStreams

    getObservationsApi(): typeof Observations

    setSiteMapPath(path: string): void
    setUpperRightBox(latLong: LatLngExpression): void
    setLowerLeftBox(latLong: LatLngExpression): void
}

export interface NodeOptions {
    name: string,
    address: string,
    port: number,
    oshPathRoot?: string,
    csAPIEndpoint?: string,
    bucketsEndpoint?: string,
    auth?: { username: string, password: string } | null,
    isSecure?: boolean,
    isDefaultNode?: boolean
    laneAdjMap?: Map<string, string>,
    oscarServiceSystem?: typeof System,
}

export class Node implements INode {
    id: string;
    name: string;
    address: string;
    port: number;
    oshPathRoot: string;
    csAPIEndpoint: string;
    bucketsEndpoint: string;
    isSecure: boolean;
    auth: { username: string, password: string } | null = null;
    isDefaultNode: boolean;
    laneAdjMap: Map<string, string> = new Map<string, string>();
    siteMapPath: string;
    lowerLeftBound: LatLngExpression;
    upperRightBound: LatLngExpression;

    dataStreamsApi: typeof DataStreams;
    systemsApi: typeof Systems;
    observationsApi: typeof Observations;
    oscarServiceSystem: typeof System;
    controlStreamApi: typeof ControlStreams;

    constructor(options: NodeOptions) {
        this.id = "node-" + hashString(options.address + "-" + options.port); // TODO: maybe do something else here
        this.name = options.name;
        this.address = options.address;
        this.port = options.port;
        this.oshPathRoot = options.oshPathRoot || '/sensorhub';
        this.csAPIEndpoint = options.csAPIEndpoint || '/api';
        this.bucketsEndpoint = options.bucketsEndpoint || '/buckets';
        this.auth = options.auth || null;
        this.isSecure = options.isSecure || false;
        this.isDefaultNode = options.isDefaultNode || false;


        let mqttOpts = {
            shared: true,
            prefix: this.csAPIEndpoint,
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}`,
            username: this.auth.username,
            password: this.auth.password,
        }

        let networkProperties = {
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`,
            tls: this.isSecure,
            streamProtocol: "mqtt",
            mqttOpts: mqttOpts,
            connectorOpts: {
                username: this.auth.username,
                password: this.auth.password
            }
        }

        this.dataStreamsApi = new DataStreams(networkProperties);
        this.systemsApi = new Systems(networkProperties);
        this.observationsApi = new Observations(networkProperties);
        this.controlStreamApi = new ControlStreams(networkProperties);
        this.oscarServiceSystem = options.oscarServiceSystem || null;

    }

    getOscarServiceSystem() {
        return this.oscarServiceSystem;
    }

    getControlStreamApi(): typeof ControlStreams {
        return this.controlStreamApi;
    }

    getObservationsApi(): typeof Observations {
        return this.observationsApi;
    }

    getSystemsApi(): typeof Systems {
        return this.systemsApi;
    }

    setSiteMapPath(path: string) {
        this.siteMapPath = path;
    }

    setLowerLeftBox(latLon: LatLngExpression) {
        this.lowerLeftBound = latLon;
    }

    setUpperRightBox(latLon: LatLngExpression) {
        this.upperRightBound = latLon;
    }

    getDataStreamsApi(): typeof DataStreams {
        return this.dataStreamsApi;
    }

    getConnectedSystemsEndpoint(noProtocolPrefix: boolean = false) {
        let protocol = this.isSecure ? 'https' : 'http';
        return noProtocolPrefix ? `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`
            : `${protocol}://${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`;
    }

    getFileServerEndpoint(noProtocolPrefix: boolean = false) {
        let protocol = this.isSecure ? 'https' : 'http';
        return noProtocolPrefix ? `${this.address}:${this.port}${this.oshPathRoot}/buckets`
            : `${protocol}://${this.address}:${this.port}${this.oshPathRoot}/buckets`;
    }

    getBasicAuthHeader() {
        const encoded = btoa(`${this.auth.username}:${this.auth.password}`);
        return {"Authorization": `Basic ${encoded}`};
    }

    async checkForEndpoint() {
        let ep: string = `${this.getConnectedSystemsEndpoint()}`;

        const response = await fetch(ep, {
            method: 'GET',
            mode: 'cors',
            headers: {
                ...this.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            return true;
        } else {
            console.warn("Error checking for API endpoint: ", response);
            return false;
        }
    }

    async fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>> {

        // check if node is reachable first
        const isReachable = await this.checkForEndpoint();

        if (!isReachable) {
            console.warn("Node is not reachable, check endpoint properties");
            return new Map<string, LaneMapEntry>();
        }

        let systems = await this.fetchSystems();
        if (!systems || systems.length == 0) return;

        systems.sort((a, b) => {
            const aIsLane = a.properties.properties?.uid.includes(SYSTEM_UID_PREFIX) ? 0 : 1;
            const bIsLane = b.properties.properties?.uid.includes(SYSTEM_UID_PREFIX) ? 0 : 1;
            return aIsLane - bIsLane;
        });

        let laneMap = new Map<string, LaneMapEntry>();

        // filter into lanes
        for (let system of systems) {
            if (system.properties.properties?.uid.includes(SYSTEM_UID_PREFIX)) {
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

            } else if (system.properties.properties.uid.includes("urn:ornl:oscar:system:")) {
                this.oscarServiceSystem = system;
            } else {
                const uid = system.properties.properties.uid;
                const uidParts = uid.split(":");

                for (let [, entry] of laneMap) {
                    const laneUid = entry.laneSystem?.properties?.properties?.uid;
                    if (!laneUid) continue;

                    const laneParts = laneUid.split(":");
                    const laneIdx = laneParts.indexOf("lane");
                    if (laneIdx < 0) continue;

                    const laneSuffix = laneParts[laneIdx + 1];

                    const isStandardSubsystem =
                        uidParts[uidParts.length - 1] === laneSuffix;

                    let isFFmpegSubsystem = false;

                    const ffmpegIdx = uidParts.indexOf("ffmpeg");
                    if (ffmpegIdx >= 0) {
                        const subLaneIdx = uidParts.indexOf("lane", ffmpegIdx);
                        const hasCorrectSuffix =
                            uidParts[subLaneIdx + 1] === laneSuffix;

                        const n = uidParts[subLaneIdx + 2];
                        const isInteger = Number.isInteger(Number(n));

                        isFFmpegSubsystem =
                            subLaneIdx > ffmpegIdx &&
                            hasCorrectSuffix &&
                            isInteger;

                        if (isFFmpegSubsystem) {
                            entry.addSystem(system);
                            break;
                        }
                    } else if(isStandardSubsystem) {
                         entry.addSystem(system);
                         break;
                    }
                }
            }
        }

        return laneMap;
    }

    async fetchSystems(): Promise<any[]> {
        let systemsApi = this.getSystemsApi();

        let searchedSystems = await systemsApi.searchSystems(new SystemFilter({ searchMembers: true, validTime: "latest" }), 500);
        let availableSystems = [];

        while (searchedSystems.hasNext()) {
            let systems = await searchedSystems.nextPage();
            availableSystems.push(...systems);
        }

        if (availableSystems.length > 0) {
            return availableSystems;
        } else {
            console.warn("No systems found, check endpoint properties for: ", this.address);
        }
    }

    async fetchObservations(): Promise<any[]> {
        let observationsApi = this.getObservationsApi();

        let searchedObservations = await observationsApi.searchObservations(new ObservationFilter(), 100);
        let availableObservations = [];

        while (searchedObservations.hasNext()) {
            let systems = await searchedObservations.nextPage();
            availableObservations.push(...systems);
        }

        if (availableObservations.length > 0) {
            return availableObservations;
        } else {
            console.warn("No observations found, check endpoint properties for: ", this.address);
        }
    }

    async fetchLatestObservationWithFilter(observationFilter: typeof ObservationFilter) {
        let observationsApi = this.getObservationsApi();

        let searchedObservations = await observationsApi.searchObservations(observationFilter, 1);

        let obsResult = await searchedObservations.nextPage();
        return obsResult;
    }


    async fetchObservationsWithFilter(observationFilter: typeof ObservationFilter): Promise<any[]> {
        let observationsApi = this.getObservationsApi();

        let searchedObservations = await observationsApi.searchObservations(observationFilter, 100);
        let availableObservations = [];

        while (searchedObservations.hasNext()) {
            let systems = await searchedObservations.nextPage();
            availableObservations.push(...systems);
        }

        if (availableObservations.length > 0) {
            return availableObservations;
        } else {
            console.warn("No observations found, check endpoint properties for: ", this.address);
        }
    }

    async fetchDataStreams(laneMap: Map<string, LaneMapEntry>) {
        const laneIds: string[] = [];
        for (const [, laneEntry] of laneMap) {
            if (laneEntry.parentNode.id != this.id) continue;
            laneIds.push(laneEntry.laneSystem.properties.id);
        }

        const dataStreamCollection = await this.getDataStreamsApi()
            .searchDataStreams(
                new DataStreamFilter({
                    system: laneIds.join(","),
                    validTime: "latest"
                }), 1000);

        const allDataStreams = [];
        while (dataStreamCollection.hasNext()) {
            const dataStreams = await dataStreamCollection.nextPage();
            allDataStreams.push(...dataStreams);
        }

        for (const dataStream of allDataStreams) {
            for (const [, laneEntry] of laneMap) {
                if (laneEntry.parentNode.id != this.id)
                    continue;
                const matchingSystem: typeof System = laneEntry.systems.find((system: typeof System) => system.properties.id == dataStream.properties["system@id"]);
                if (matchingSystem != null) {
                    laneEntry.addDataStream(dataStream);
                }
            }
        }
    }

    async fetchDataStream(system: typeof System) {
        let allDatastreams = [];
        const datastreams = await system.searchDataStreams(new DataStreamFilter({ validTime: "latest" }), 100);
        while (datastreams.hasNext()) {
            const datastreamResults = await datastreams.nextPage();
            allDatastreams.push(...datastreamResults);
        }
        return allDatastreams;
    }

    async fetchLaneControlStreams(laneMap: Map<string, LaneMapEntry>) {
        const laneIds: string[] = [];
        for (const [, laneEntry] of laneMap) {
            if (laneEntry.parentNode.id != this.id) continue;
            laneIds.push(laneEntry.laneSystem.properties.id);
        }

        const controlStreamCollection = await this.getControlStreamApi()
            .searchControlStreams(
                new ControlStreamFilter({
                    system: laneIds.join(","),
                    validTime: "latest"
                }), 1000);

        const allControlStreams = [];
        while (controlStreamCollection.hasNext()) {
            const controlStreams = await controlStreamCollection.nextPage();
            allControlStreams.push(...controlStreams);
        }

        for (const controlStream of allControlStreams) {
            for (const [, laneEntry] of laneMap) {
                if (laneEntry.parentNode.id != this.id)
                    continue;
                const matchingSystem: typeof System = laneEntry.systems.find((system: typeof System) => system.properties.id == controlStream.properties["system@id"]);
                if (matchingSystem != null) {
                    laneEntry.addControlStream(controlStream);
                }
            }
        }
    }

    async fetchNodeControlStreams(): Promise<any[]>{
        let availableControlStreams = [];
        const controlStreamCollection = await this.getControlStreamApi().searchControlStreams(new ControlStreamFilter({ validTime: "latest" }), 1);
        while (controlStreamCollection.hasNext()) {
            let controlStreamResults = await controlStreamCollection.nextPage();
            availableControlStreams.push(...controlStreamResults);
        }

        if(availableControlStreams.length > 0)
            return availableControlStreams;
        else
            console.warn("No control streams found for : ", this.address);
    }

    async fetchNodeDataStreams(): Promise<any[]>{
        let availableDataStreams = [];
        const dataStreamCollection = await this.getDataStreamsApi().searchDataStreams(new DataStreamFilter({ validTime: "latest" }), 1);
        while (dataStreamCollection.hasNext()) {
            let dataStreamResults = await dataStreamCollection.nextPage();
            availableDataStreams.push(...dataStreamResults);
        }

        if(availableDataStreams.length > 0)
            return availableDataStreams;
        else
            console.warn("No data streams found for : ", this.address);
    }
}
