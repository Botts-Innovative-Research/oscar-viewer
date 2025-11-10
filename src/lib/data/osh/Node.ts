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

const SYSTEM_UID_PREFIX = "urn:osh:system:";

export interface INode {
    id: string,
    name: string,
    address: string,
    port: number,
    oshPathRoot: string,
    csAPIEndpoint: string,
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

    fetchLanes(): Promise<{ systems: typeof System[]; lanes: LaneMeta[] }>,

    fetchSystems(): Promise<any[]>,

    fetchDataStreams(laneMap: Map<string, LaneMapEntry>): void,

    fetchLaneSystemsAndSubsystems(): Promise<Map<string, LaneMapEntry>>,

    fetchOscarServiceSystem(): Promise<any>,

    fetchLaneControlStreams(laneMap: Map<string, LaneMapEntry>): Promise<any>,

    fetchNodeControlStreams(): Promise<any>,

    checkForEndpoint(): Promise<boolean>

    getOscarServiceSystem(): typeof System

    fetchDataStream(system: typeof System): Promise<any[]>

    fetchLatestObservation(): Promise<any>

    fetchObservationsWithFilter(observationFilter: typeof ObservationFilter): Promise<any[]>

    fetchLatestObservationWithFilter(observationFilter: typeof ObservationFilter): Promise<any[]>

    getDataStreamsApi(): typeof DataStreams

    getSystemsApi(): typeof Systems

    getControlStreamApi(): typeof ControlStreams

    getObservationsApi(): typeof Observations

    authFileServer(): any

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
        this.auth = options.auth || null;
        this.isSecure = options.isSecure || false;
        this.isDefaultNode = options.isDefaultNode || false;



        let mqttOpts = {
            prefix: this.csAPIEndpoint,
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}`,
            username: this.auth.username,
            password: this.auth.password,
            shared: true,

        }

        let apiConfig = {
            endpointUrl: `${this.address}:${this.port}${this.oshPathRoot}${this.csAPIEndpoint}`,
            tls: this.isSecure,
            streamProtocol: "mqtt",
            mqttOpts: mqttOpts,
            connectorOpts: {
                username: this.auth.username,
                password: this.auth.password
            }
        }

        this.dataStreamsApi = new DataStreams(apiConfig);
        this.systemsApi = new Systems(apiConfig);
        this.observationsApi = new Observations(apiConfig);
        this.controlStreamApi = new ControlStreams(apiConfig);
        this.oscarServiceSystem = options.oscarServiceSystem || null;

    }

    async authFileServer() {

        let ep: string = `${this.getFileServerEndpoint()}`;

        const response = await fetch(ep, {
            method: 'GET',
            mode: 'cors',
            headers: {
                ...this.getBasicAuthHeader()
            }
        });

      return response.ok

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

    async searchObservations(observationFilter: typeof ObservationFilter, pageSize: number = 10) {
        return await this.getObservationsApi().searchObservations(observationFilter, pageSize);
    }

    async searchSystems(systemFilter: typeof SystemFilter, pageSize: number = 10) {
        return await this.getSystemsApi().searchSystems(systemFilter, pageSize);
    }

    getDataStreamsApi(): typeof DataStreams {
        return this.dataStreamsApi;
    }

    async searchDataStreams(dsFilter: typeof DataStreamFilter, pageSize: number = 10) {
        return await this.getDataStreamsApi().searchDataStreams(dsFilter, pageSize);
    }

    setObservationsApi(apiConfig: string): typeof Observations {
        return new Observations(apiConfig)
    }

    setSystemsApi(apiConfig: string): typeof Systems {
        return new Systems(apiConfig)
    }

    setOscarServiceSystem(system: typeof System){
        this.oscarServiceSystem = system;
    }

    setDataStreamsApi(apiConfig: string): typeof DataStreams {
        return new DataStreams(apiConfig);
    }

    setControlStreamApi(apiConfig: string): typeof ControlStreams {
        return new ControlStreams(apiConfig);
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

    async fetchLanes(): Promise<{ systems: typeof System[]; lanes: LaneMeta[] }> {
        let fetchedLanes: LaneMeta[] = [];
        let fetchedSystems: ISystem[] = [];
        // first, fetch the systems
        const systems_arr = await this.fetchSystems();
        for (let system of systems_arr) {

            const newSystem = new System(system.id, system.properties.uid, system.properties.name, this, null);
            fetchedSystems.push(newSystem);
            // Test for lane signature in uid
            if (system.properties.uid.includes(SYSTEM_UID_PREFIX)) {
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
        return {lanes: null, systems: systems_arr};
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

                let subsystems = await system.searchMembers();
                while (subsystems.hasNext()) {
                    let subsystemResults = await subsystems.nextPage();
                    laneMap.get(laneName).addSystems(subsystemResults);
                }
            }
        }

        return laneMap;
    }

    async fetchOscarServiceSystem(){
        const isReachable = await this.checkForEndpoint();

        if (!isReachable) {
            console.warn("Node is not reachable, check endpoint properties");
            return;
        }

        let systems = await this.fetchSystems();
        if (!systems || systems.length == 0) return;

        for(let system of systems){
            if (system.properties.properties.uid.includes("urn:ornl:oscar:system:")) {
                // todo add oscar service system some where
                this.oscarServiceSystem = system;
            }
        }
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

    async fetchLatestObservation() {
        let observationsApi = this.getObservationsApi();

        let searchedObservations = await observationsApi.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);

        let obsResult = await searchedObservations.nextPage();
        return obsResult;
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
        for (const [, laneEntry] of laneMap) {
            if (laneEntry.parentNode.id != this.id) continue;
            try {
                const datastreams = await laneEntry.laneSystem.searchDataStreams(undefined, 100);
                while (datastreams.hasNext()) {
                    const datastreamResults = await datastreams.nextPage();
                    laneEntry.addDataStreams(datastreamResults);
                }
            } catch (error) {
                console.error(`Error fetching datastreams for system ${laneEntry.laneSystem.id}:`, error);
            }
        }
    }

    async fetchDataStream(system: typeof System) {
        let allDatastreams = [];
        const datastreams = await system.searchDataStreams(undefined, 100);
        while (datastreams.hasNext()) {
            const datastreamResults = await datastreams.nextPage();
            allDatastreams.push(...datastreamResults);
        }
        return allDatastreams;
    }

    async fetchLaneControlStreams(laneMap: Map<string, LaneMapEntry>) {
        for (const [, laneEntry] of laneMap) {
            if (laneEntry.parentNode.id != this.id) continue;
            try {
                const controlStreams = await laneEntry.laneSystem.searchControlStreams(undefined, 100);
                while (controlStreams.hasNext()) {
                    const controlStreamResults = await controlStreams.nextPage();
                    laneEntry.addControlStreams(controlStreamResults);
                }
            } catch (error) {
                console.error(`Error fetching control streams for system ${laneEntry.laneSystem.id}:`, error);
            }
        }
    }

    async fetchNodeControlStreams(): Promise<any[]>{
        let availableControlStreams = [];
        const controlStreamCollection = await this.getControlStreamApi().searchControlStreams(undefined, 100);
        while (controlStreamCollection.hasNext()) {
            let controlStreamResults = await controlStreamCollection.nextPage();
            availableControlStreams.push(...controlStreamResults);
        }

        if(availableControlStreams.length > 0)
            return availableControlStreams;
        else
            console.warn("No control streams found for : ", this.address);
    }
}
