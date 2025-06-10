/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import System from "osh-js/source/core/consysapi/system/System.js";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import {INode, insertObservation} from "@/lib/data/osh/Node";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {
    isConnectionDatastream,
    isGammaDatastream,
    isNeutronDatastream,
    isOccupancyDatastream,
    isTamperDatastream, isThresholdDatastream,
    isVideoDatastream
} from "./Utilities";
import {AdjudicationDatastreamConstant} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";

class ILaneMeta {
    id: string;
    name: string;
    label: string;
    systemIds: string[];
    hasEML: boolean;
}

export class LaneMeta implements ILaneMeta {
    id: string;
    name: string;
    label: string;
    systemIds: string[];
    hasEML: boolean;

    constructor(name: string, systemIds: string[], hasEML: boolean = false) {
        this.id = "lane" + randomUUID();
        this.name = name;
        this.label = name.replace(" ", "_").toLowerCase();
        this.systemIds = systemIds;
        this.hasEML = hasEML;
    }
}

export class LaneMapEntry {
    systems: typeof System[];
    datastreams: typeof DataStream[];
    datasources: any[];
    datasourcesBatch: any[];
    datasourcesRealtime: any[];
    parentNode: INode;
    laneSystem: typeof System;
    private adjDs: string;
    // adjControlStreamId: string;
    laneName: string;
    controlStreams: any[]

    constructor(node: INode) {
        this.systems = [];
        this.datastreams = [];
        this.datasources = [];
        this.datasourcesBatch = [];
        this.datasourcesRealtime = [];
        this.parentNode = node;
        this.laneName = undefined;
        this.controlStreams = [];
    }

    setLaneSystem(system: typeof System) {
        this.laneSystem = system;
    }

    addSystem(system: any) {
        this.systems.push(system);
    }

    addSystems(systems: any[]) {
        this.systems.push(...systems);
    }

    addDatastream(datastream: any) {
        this.datastreams.push(datastream);
    }

    addDatastreams(datastreams: any[]) {
        this.datastreams.push(...datastreams);
    }

    addDatasource(datasource: any) {
        this.datasources.push(datasource);
    }

    addDatasources(datasources: any[]) {
        this.datasources.push(...datasources);
    }
    setLaneName(name: string){
        this.laneName = name;
    }

    addControlStreams(controlStreams: any[]){
        this.controlStreams.push(...controlStreams)
    }

    async getAdjudicationDatastream(dsId: string) {
        let isSecure = this.parentNode.isSecure;
        let url = this.parentNode.getConnectedSystemsEndpoint(true);
        console.log("[ADJ-log] Creating Adjudication Datastream: ", this, url);

        let dsApi = new DataStreams({
            // streamProtocol: isSecure ? "https" : "http",
            endpointUrl: `${url}`,
            tls: isSecure,
            connectorOpts: {
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password
            },
        });
        let datastream = await dsApi.getDataStreamById(dsId);
        console.log("[ADJ-log] Adjudication Datastream: ", datastream);
        return datastream;
    }

    resetDatasources() {
        for (let ds of this.datasourcesRealtime) {
            ds.disconnect();
        }
        for (let ds of this.datasourcesBatch) {
            ds.disconnect();
        }
    }

    addDefaultConSysApis() {
        this.resetDatasources();

        let rtArray: any[] = [];
        let batchArray: any[] = [];


        for (const dsObj of this.datastreams) {

            if (!dsObj || !dsObj.networkProperties || !dsObj.properties) {
                console.warn("Skipping invalid datastream:", dsObj);
                continue;
            }

            let mqttOptUrlArray = (dsObj.networkProperties.endpointUrl).split("/");

            let mqttOptUrl = mqttOptUrlArray[0] + "/" + mqttOptUrlArray[1];

            let mqttOpts = {
                prefix: this.parentNode.csAPIEndpoint,
                endpointUrl: mqttOptUrl,
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password,
            }

            try {
                let dsRT: typeof ConSysApi = null;
                let dsBatch: typeof ConSysApi = null;

                if(isVideoDatastream(dsObj)){
                    dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                        protocol: dsObj.networkProperties.streamProtocol,
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        responseFormat: 'application/swe+binary',
                        mode: Mode.REAL_TIME,
                    });

                    dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                        protocol: dsObj.networkProperties.streamProtocol,
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        responseFormat: 'application/swe+binary',
                        mode: Mode.BATCH,
                        startTime: "2020-01-01T08:13:25.845Z",
                        endTime: "2055-01-01T08:13:25.845Z"
                    });
                }else{
                    dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        protocol: "mqtt",
                        mqttOpts: mqttOpts,
                        mode: Mode.REAL_TIME,
                        responseFormat: 'application/swe+json',
                    });

                    dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        protocol: "mqtt",
                        mqttOpts: mqttOpts,
                        mode: Mode.BATCH,
                        responseFormat: 'application/swe+json',
                        startTime: "2020-01-01T08:13:25.845Z",
                        endTime: "2055-01-01T08:13:25.845Z"
                    });
                }

                // const dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                //     protocol: "mqtt",
                //     mqttOpts: mqttOpts,
                //     endpointUrl: dsObj.networkProperties.endpointUrl,
                //     resource: `/datastreams/${dsObj.properties.id}/observations`,
                //     tls: dsObj.networkProperties.tls,
                //     responseFormat: isVideoDatastream(dsObj) ? 'application/swe+binary' : 'application/swe+json',
                //     mode: Mode.REAL_TIME,
                // });

                // const dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                //     protocol: "mqtt",
                //     mqttOpts: mqttOpts,
                //     endpointUrl: dsObj.networkProperties.endpointUrl,
                //     resource: `/datastreams/${dsObj.properties.id}/observations`,
                //     tls: dsObj.networkProperties.tls,
                //     responseFormat: isVideoDatastream(dsObj) ? 'application/swe+binary' : 'application/swe+json',
                //     mode: Mode.BATCH,
                //     startTime: "2020-01-01T08:13:25.845Z",
                //     endTime: "2055-01-01T08:13:25.845Z"
                // });

                rtArray.push(dsRT);
                batchArray.push(dsBatch);
            } catch (e) {
                console.error("[ERROR] Failed to create ConSysApi for datastream:", dsObj, "\nError:", e);
            }
        }

        this.datasourcesRealtime = rtArray;
        this.datasourcesBatch = batchArray;
    }

    createReplayConSysApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        let mqttOptUrlArray = (datastream.networkProperties.endpointUrl).split("/");
        let mqttOptUrl = mqttOptUrlArray[0] + "/" + mqttOptUrlArray[1];

        let mqttOpts = {
            prefix: this.parentNode.csAPIEndpoint,
            endpointUrl: mqttOptUrl,
            username: this.parentNode.auth.username,
            password: this.parentNode.auth.password,
        }
        console.log("mqtt opts: ", mqttOpts)
        return new ConSysApi(`rtds-${datastream.properties.id}`, {
            protocol: "mqtt",
            mqttOpts: mqttOpts,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDatastream(datastream) ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.REPLAY,
            startTime: startTime,
            endTime: endTime
        });
    }

    createBatchConSysApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        let mqttOptUrlArray = (datastream.networkProperties.endpointUrl).split("/");
        let mqttOptUrl = mqttOptUrlArray[0] + "/" + mqttOptUrlArray[1];

        let mqttOpts = {
            prefix: this.parentNode.csAPIEndpoint,
            endpointUrl: mqttOptUrl,
            username: this.parentNode.auth.username,
            password: this.parentNode.auth.password,
        }

        return new ConSysApi(`batchds-${datastream.properties.id}`, {
            protocol: "mqtt",
            mqttOpts: mqttOpts,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDatastream(datastream) ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.BATCH,
            startTime: startTime,
            endTime: endTime
        });
    }

    findDataStreamByName(nameFilter: string): typeof DataStream {
        let ds: typeof DataStream = this.datastreams.find((ds) => ds.properties.name.includes(nameFilter))
        return ds;
    }

    lookupSystemIdFromDataStreamId(dsId: string): string {
        let dataStream: typeof DataStream = this.datastreams.find((ds) => ds.properties.id === dsId);

        return this.systems.find((sys) => sys.properties.id === dataStream.properties["system@id"]).properties.id;
    }

    findDataStreamByObsProperty(obsProperty: string){
        let stream: typeof DataStream = this.datastreams.filter((ds)=> {
            // console.log("FIND ds props", ds)
            let hasProp = ds.properties.observedProperties.some((prop: any)=> prop.definition === obsProperty)
            return hasProp;
        });
        return stream;
    }


    /**
     * Retrieves datastreams within the specified time range and categorizes them by event detail types.
     *
     * @param {number} startTime - The start time of the range for datastreams.
     * @param {number} endTime - The end time of the range for datastreams.
     * @return {Map<string, typeof ConSysApi[]>} A map categorizing the replayed datastreams by their event detail types.
     */
    async getDatastreamsForEventDetail(startTime: string, endTime: string): Promise<Map<string, typeof ConSysApi[]>>{

        let dsMap: Map<string, typeof ConSysApi[]> = new Map();
        dsMap.set('occ', []);
        dsMap.set('gamma', []);
        dsMap.set('neutron', []);
        dsMap.set('tamper', []);
        dsMap.set('video', []);
        dsMap.set('gammaTrshld', []);
        dsMap.set('connection', []);

        for (const ds of this.datastreams) {

            const datasourceBatch = this.createBatchConSysApiFromDataStream(ds, startTime, endTime);

            if (isOccupancyDatastream(ds)) {
                let occArray = dsMap.get('occ')!;

                occArray.push(datasourceBatch);
            }

            if(isGammaDatastream(ds)){
                let gammaArray = dsMap.get('gamma')!;
                gammaArray.push(datasourceBatch);
            }

            if(isNeutronDatastream(ds)){
                let neutronArray = dsMap.get('neutron')!;
                neutronArray.push(datasourceBatch);
            }

            if(isTamperDatastream(ds)){
                let tamperArray = dsMap.get('tamper')!;
                tamperArray.push(datasourceBatch);
            }

            if(isVideoDatastream(ds)) {
                let videoArray = dsMap.get('video')!;
                videoArray.push(ds);
            }
            if(isThresholdDatastream(ds)){
                let gammaTrshldArray = dsMap.get('gammaTrshld')!;
                gammaTrshldArray.push(datasourceBatch);
            }

            if(isConnectionDatastream(ds)){
                let connectionArray = dsMap.get('connection')!;
                connectionArray.push(datasourceBatch);
            }
        }


        let ds = dsMap;

        const videoDs = ds.get("video") || [];

        const processVideoDs: typeof DataStream[] = [];
        const regularVideoDs: typeof DataStream[] = [];

        for(const ds of videoDs){

            const uid = ds.properties['system@link'].uid;
            const uidArray = uid.split(":");

            if(uidArray.includes("process")){
                processVideoDs.push(ds);
            } else{
                regularVideoDs.push(ds);
            }
        }

        let validVideos: typeof DataStream[] = [];

        if(processVideoDs.length > 0){

            for(const videoDs of processVideoDs){
                const video = await this.checkValidDataSource(videoDs, startTime, endTime)
                if(video){
                    validVideos.push(video);
                }

            }


        }else if(processVideoDs.length == 0 && regularVideoDs.length > 0) {

            for(const videoDs of regularVideoDs){
                const video = await this.checkValidDataSource(videoDs, startTime, endTime)
                if(video){
                    validVideos.push(video);
                }
            }
        }

        dsMap.set("video", validVideos);
        return dsMap;
    }

    async checkValidDataSource(ds: typeof DataStream, startTime: string, endTime: string): Promise<typeof ConSysApi> {

        let datasourceReplay = this.createReplayConSysApiFromDataStream(ds, startTime, endTime);

        let dsApi = this.parentNode.getDataStreamsApi();

        const result = await dsApi.getDataStreamById(ds.properties.id);

        let validStartTime, validEndTime: string | null;

        validStartTime = result?.properties?.resultTime[0];
        validEndTime = result?.properties?.resultTime[1];


        // Ensure startTime and endTime are within the datastream's valid data time
        if (validStartTime && validEndTime) {

            const validStart = new Date(validStartTime);
            const validEnd = new Date(validEndTime);

            validStart.setSeconds(validStart.getSeconds() - 1);
            validEnd.setSeconds(validEnd.getSeconds() + 1);

            const eventStart = new Date(startTime);
            const eventEnd = new Date(endTime);

            if (eventStart >= validStart && eventEnd <= validEnd) {
                console.info("[IS-VIDEO] Found valid datastream ", ds)
                return datasourceReplay;
            } else {
                console.info(`[IS-VIDEO] Data within interval ${validStart} - ${validEnd} not found for datasource`);
            }
        } else {
            console.info("[IS-VIDEO] No valid time found for datasource ", ds.properties.id);
        }


    }

    async insertAdjudicationSystem(laneName: string) {

        console.log("[ADJ] Inserting Adjudication System for lane: ", this);
        let laneId = this.laneSystem.properties.properties.uid.split(":").pop();

        let adJSysJSON = {
            "type": "SimpleProcess",
            "uniqueId": `urn:ornl:client:adjudication:${laneId}`,
            "label": `Adjudication System - ${laneName}`,
            "definition": "sosa:System"
        }

        console.log("[ADJ] Inserting Adjudication System: ", adJSysJSON);
        let endpoint: string = `${this.parentNode.getConnectedSystemsEndpoint(false)}/systems/`;

        let sysId: string = await this.parentNode.insertSystem(adJSysJSON, endpoint);
        console.log("[ADJ] Inserted Adjudication System: ", sysId);
        // let dsId = this.insertAdjudicationDataStream(laneName);
        return sysId;
    }

    async insertAdjudicationDataStream(systemId: string) {
        let endpoint: string = `${this.parentNode.getConnectedSystemsEndpoint(false)}/systems/` + systemId + '/datastreams/';

        let dsRes = await this.parentNode.insertDatastream(endpoint, AdjudicationDatastreamConstant);
        if (dsRes) {
            console.log("[ADJ] Inserted Adjudication Datastream: ", dsRes);
            this.adjDs = dsRes;
        }
    }

    async insertAdjudicationObservation(obsData: AdjudicationData, datastreamId: string) {
        let endpoint: string = `${this.parentNode.getConnectedSystemsEndpoint(false)}/datastreams/${datastreamId}/observations`;

        let obsRes = await insertObservation(endpoint, obsData);
        if (obsRes) {
            console.log("[ADJ] Inserted Adjudication Observation: ", obsRes);
        }
    }
}

export class LaneDSColl {
    occRT: typeof ConSysApi[];
    occBatch: typeof ConSysApi[];
    gammaRT: typeof ConSysApi[];
    gammaBatch: typeof ConSysApi[];
    neutronRT: typeof ConSysApi[];
    neutronBatch: typeof ConSysApi[];
    tamperRT: typeof ConSysApi[];
    tamperBatch: typeof ConSysApi[];
    locRT: typeof ConSysApi[];
    locBatch: typeof ConSysApi[];
    gammaTrshldBatch: typeof ConSysApi[];
    gammaTrshldRT: typeof ConSysApi[];
    videoRT: typeof ConSysApi[];
    videoBatch: typeof ConSysApi[];
    adjRT: typeof ConSysApi[];
    adjBatch: typeof ConSysApi[];
    connectionRT: typeof ConSysApi[];
    connectionBatch: typeof ConSysApi[];


    constructor() {
        this.occRT = [];
        this.occBatch = [];
        this.gammaRT = [];
        this.gammaBatch = [];
        this.neutronRT = [];
        this.neutronBatch = [];
        this.tamperRT = [];
        this.tamperBatch = [];
        this.locBatch = [];
        this.locRT = [];
        this.gammaTrshldBatch = [];
        this.gammaTrshldRT = [];
        this.connectionRT = [];
        this.videoRT = [];
        this.videoBatch = [];
        this.adjRT = [];
        this.adjBatch = [];
        this.connectionBatch =[];
        this.connectionRT = [];
    }

    getDSArray(propName: string): typeof ConSysApi[] {
        // @ts-ignore
        return this[propName];
    }

    addDS(propName: string, ds: typeof ConSysApi) {
        let dsArr = this.getDSArray(propName);
        if (dsArr.some((d) => d.name == ds.name)) {
            return;
        } else {
            dsArr.push(ds);
        }
    }

    addSubscribeHandlerToAllBatchDS(handler: Function) {
        for (let ds of this.occBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.gammaBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.neutronBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.tamperBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.locBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.occBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.gammaTrshldBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.adjBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.connectionBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.videoBatch) {
            ds.subscribe(handler, [EventType.DATA]);
        }
    }

    addSubscribeHandlerToAllRTDS(handler: Function) {
        for (let ds of this.occRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.gammaRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.neutronRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.tamperRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.locRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.gammaTrshldRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.connectionRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.videoRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
        for (let ds of this.adjRT) {
            ds.subscribe(handler, [EventType.DATA]);
        }
    }

    [key: string]: typeof ConSysApi[] | Function;

    addSubscribeHandlerToALLDSMatchingName(dsCollName: string, handler: Function) {
        if(!this) return;

        for (let ds of this[dsCollName] as typeof ConSysApi[]) {
            ds.subscribe(handler, [EventType.DATA]);
        }
    }

    async connectAllDS() {
        for (let ds of this.occRT) {
            await ds.connect();
        }
        for (let ds of this.occBatch) {
            await ds.connect();
        }
        for (let ds of this.gammaRT) {
            await ds.connect();
        }
        for (let ds of this.gammaBatch) {
            await ds.connect();
        }
        for (let ds of this.neutronRT) {
            await ds.connect();
        }
        for (let ds of this.neutronBatch) {
            await ds.connect();
        }
        for (let ds of this.tamperRT) {
            await ds.connect();
        }
        for (let ds of this.tamperBatch) {
            await ds.connect();
        }
        for (let ds of this.locRT) {
            await ds.connect();
        }
        for (let ds of this.locBatch) {
            await ds.connect();
        }
        for (let ds of this.gammaTrshldBatch) {
            await ds.connect();
        }
        for (let ds of this.gammaTrshldRT) {
            await ds.connect();
        }
        for (let ds of this.connectionRT) {
            await ds.connect();
        }
        for (let ds of this.connectionBatch) {
            await ds.connect();
        }
        for (let ds of this.videoRT) {
            await ds.connect();
        }
        for (let ds of this.videoBatch) {
            await ds.connect();
        }
        // console.info("Connecting all datasources of:", this);
    }
}

