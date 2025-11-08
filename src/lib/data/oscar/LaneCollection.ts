/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import System from "osh-js/source/core/consysapi/system/System.js";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import {INode} from "@/lib/data/osh/Node";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";

import {
    isConnectionDataStream,
    isGammaDataStream,
    isNeutronDataStream,
    isOccupancyDataStream,
    isTamperDataStream,
    isThresholdDataStream,
    isVideoDataStream
} from "./Utilities";

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

    addDataStream(datastream: any) {
        this.datastreams.push(datastream);
    }

    addDataStreams(datastreams: any[]) {
        this.datastreams.push(...datastreams);
    }

    addDataSource(datasource: any) {
        this.datasources.push(datasource);
    }

    addDataSources(datasources: any[]) {
        this.datasources.push(...datasources);
    }
    setLaneName(name: string){
        this.laneName = name;
    }

    addControlStreams(controlStreams: any[]){
        this.controlStreams.push(...controlStreams)
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
                shared: true,
                prefix: this.parentNode.csAPIEndpoint,
                endpointUrl: mqttOptUrl,
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password,
            }

            try {
                let dsRT: typeof ConSysApi = null;
                let dsBatch: typeof ConSysApi = null;

                if (isVideoDataStream(dsObj)) {
                    dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                        // protocol: dsObj.networkProperties.streamProtocol,
                        protocol: 'mqtt',
                        mqttOpts: mqttOpts,
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        responseFormat: 'application/swe+binary',
                        mode: Mode.REAL_TIME,
                    });

                    dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                        // protocol: dsObj.networkProperties.streamProtocol,
                        protocol: 'mqtt',
                        mqttOpts: mqttOpts,
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        responseFormat: 'application/swe+binary',
                        mode: Mode.BATCH,
                        startTime: "2020-01-01T08:13:25.845Z",
                        endTime: "2055-01-01T08:13:25.845Z"
                    });
                } else {
                    dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        // protocol: dsObj.networkProperties.streamProtocol,
                        protocol: 'mqtt',
                        mqttOpts: mqttOpts,
                        mode: Mode.REAL_TIME,
                        responseFormat: 'application/swe+json',
                    });

                    dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                        endpointUrl: dsObj.networkProperties.endpointUrl,
                        resource: `/datastreams/${dsObj.properties.id}/observations`,
                        tls: dsObj.networkProperties.tls,
                        // protocol: dsObj.networkProperties.streamProtocol,
                        protocol: 'mqtt',
                        mqttOpts: mqttOpts,
                        mode: Mode.BATCH,
                        responseFormat: 'application/swe+json',
                        startTime: "2020-01-01T08:13:25.845Z",
                        endTime: "2055-01-01T08:13:25.845Z"
                    });
                }

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
        return new ConSysApi(`rtds-${datastream.properties.id}`, {
            // protocol: datastream.networkProperties.streamProtocol,
            protocol: 'mqtt',
            mqttOpts: mqttOpts,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDataStream(datastream) ? 'application/swe+binary' : 'application/swe+json',
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
            // protocol: datastream.networkProperties.streamProtocol,
            protocol: 'mqtt',
            mqttOpts: mqttOpts,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDataStream(datastream) ? 'application/swe+binary' : 'application/swe+json',
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
        let stream: typeof DataStream = this.datastreams.find((ds)=> {
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
        dsMap.set('gammaTrshld', []);
        dsMap.set('connection', []);

        for (const ds of this.datastreams) {

            const datasourceBatch = this.createBatchConSysApiFromDataStream(ds, startTime, endTime);

            if (isOccupancyDataStream(ds)) {
                let occArray = dsMap.get('occ')!;
                occArray.push(datasourceBatch);
            }

            if(isGammaDataStream(ds)){
                let gammaArray = dsMap.get('gamma')!;
                gammaArray.push(datasourceBatch);
            }

            if(isNeutronDataStream(ds)){
                let neutronArray = dsMap.get('neutron')!;
                neutronArray.push(datasourceBatch);
            }

            if(isTamperDataStream(ds)){
                let tamperArray = dsMap.get('tamper')!;
                tamperArray.push(datasourceBatch);
            }

            if(isThresholdDataStream(ds)){
                let gammaTrshldArray = dsMap.get('gammaTrshld')!;
                gammaTrshldArray.push(datasourceBatch);
            }

            if(isConnectionDataStream(ds)){
                let connectionArray = dsMap.get('connection')!;
                connectionArray.push(datasourceBatch);
            }
        }
        return dsMap;
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
        this.adjRT = [];
        this.adjBatch = [];
        this.connectionBatch =[];
        this.connectionRT = [];
    }

    getDSArray(propName: string): typeof ConSysApi[] {
        // @ts-ignore
        return this[propName];
    }

    getAllDSArrayNames(): string[]{
        return [
            'occBatch',
            'gammaBatch',
            'neutronBatch',
            'tamperBatch',
            'locBatch',
            'gammaTrshldBatch',
            'adjBatch',
            'connectionBatch',
            'occRT',
            'gammaRT',
            'neutronRT',
            'tamperRT',
            'locRT',
            'gammaTrshldRT',
            'connectionRT',
            'adjRT'
        ]
    }

    getBatchDSArrayNames(): string[]{
        return [
            'occBatch',
            'gammaBatch',
            'neutronBatch',
            'tamperBatch',
            'locBatch',
            'gammaTrshldBatch',
            'adjBatch',
            'connectionBatch',
        ]
    }

    getRTDSArrayNames(): string[] {
        return [
            'occRT',
            'gammaRT',
            'neutronRT',
            'tamperRT',
            'locRT',
            'gammaTrshldRT',
            'connectionRT',
            'adjRT'
        ];
    }

    addDS(propName: string, ds: typeof ConSysApi) {
        let dsArr = this.getDSArray(propName);
        if (dsArr.some((d) => d.name == ds.name)) {
            return;
        } else {
            dsArr.push(ds);
        }
    }

    addSubscriptionToDS(dsArrayNames: string[], handler: Function){
        for(const name of dsArrayNames){
            const dsArray = this.getDSArray(name);
            for(const ds of dsArray){
                ds.subscribe(handler, [EventType.DATA]);
            }
        }
    }

    addSubscribeHandlerToAllBatchDS(handler: Function) {
        this.addSubscriptionToDS(this.getBatchDSArrayNames(), handler);
    }

    addSubscribeHandlerToAllRTDS(handler: Function) {
        this.addSubscriptionToDS(this.getRTDSArrayNames(), handler);
    }

    addSubscribeHandlerToALLDSMatchingName(dsCollName: string, handler: Function) {
        if(!this) return;
        this.addSubscriptionToDS([dsCollName], handler);
    }

    async connectToDS(dsArrayNames: string[]){
        for(const name of dsArrayNames) {
            const dsArray = this.getDSArray(name);
            for (const ds of dsArray) {
                await ds.connect()
            }
        }
    }

    async disconnectToDS(dsArrayNames: string[]){
        for(const name of dsArrayNames) {
            const dsArray = this.getDSArray(name);
            for (const ds of dsArray) {
                await ds.disconnect()
            }
        }
    }

    async addConnectToALLDSMatchingName(dsCollName: string) {
        if(!this) return;
        await this.connectToDS([dsCollName]);
    }

    async addDisconnectToALLDSMatchingName(dsCollName: string) {
        if(!this) return;
        await this.disconnectToDS([dsCollName]);
    }

    async connectAllDS() {
       await this.connectToDS(this.getAllDSArrayNames());
    }

    async disconnectAllDS() {
        await this.disconnectToDS(this.getAllDSArrayNames());
    }

    async connectRTDS() {
        await this.connectToDS(this.getRTDSArrayNames());
    }

    async disconnectRTDS() {
        await this.disconnectToDS(this.getRTDSArrayNames());
    }

    async connectBatchDS() {
        await this.connectToDS(this.getBatchDSArrayNames());
    }

    async disconnectBatchDS() {
        await this.disconnectToDS(this.getBatchDSArrayNames());
    }
}

