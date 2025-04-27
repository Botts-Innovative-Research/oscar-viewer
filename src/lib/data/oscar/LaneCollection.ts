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
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {
    isGammaDatastream,
    isNeutronDatastream,
    isOccupancyDatastream,
    isTamperDatastream, isThresholdDatastream,
    isVideoDatastream
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
            }
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
        // TODO: Verify that this doesn't negatively impact the app's visual usage
        this.resetDatasources();

        let rtArray = [];
        let batchArray = [];

        for (let dsObj of this.datastreams) {

            let dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                protocol: dsObj.networkProperties.streamProtocol,
                endpointUrl: dsObj.networkProperties.endpointUrl,
                resource: `/datastreams/${dsObj.properties.id}/observations`,
                tls: dsObj.networkProperties.tls,
                responseFormat: isVideoDatastream(dsObj) ? 'application/swe+binary' : 'application/swe+json',
                mode: Mode.REAL_TIME,
                connectorOpts: {
                    username: this.parentNode.auth.username,
                    password: this.parentNode.auth.password
                }
            });

            let dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                protocol: dsObj.networkProperties.streamProtocol,
                endpointUrl: dsObj.networkProperties.endpointUrl,
                resource: `/datastreams/${dsObj.properties.id}/observations`,
                tls: dsObj.networkProperties.tls,
                responseFormat: isVideoDatastream(dsObj) ? 'application/swe+binary' : 'application/swe+json',
                mode: Mode.BATCH,
                connectorOpts: {
                    username: this.parentNode.auth.username,
                    password: this.parentNode.auth.password
                },
                startTime: "2020-01-01T08:13:25.845Z",
                endTime: "2055-01-01T08:13:25.845Z",
                // endTime: new Date((new Date().getTime() - 1000000)).toISOString()

            });

            // this.datasources.push([dsRT, dsBatch]);
            rtArray.push(dsRT);
            batchArray.push(dsBatch);
        }
        this.datasourcesRealtime = rtArray;
        this.datasourcesBatch = batchArray;
    }

    createReplayConSysApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        return new ConSysApi(`rtds-${datastream.properties.id}`, {
            protocol: datastream.networkProperties.streamProtocol,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDatastream(datastream) ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.REPLAY,
            connectorOpts: {
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password
            },
            startTime: startTime,
            endTime: endTime
        });
    }

    createBatchConSysApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        return new ConSysApi(`batchds-${datastream.properties.id}`, {
            protocol: datastream.networkProperties.streamProtocol,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: isVideoDatastream(datastream) ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.BATCH,
            connectorOpts: {
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password
            },
            startTime: startTime,
            endTime: endTime
        });
    }

    findDataStreamByName(nameFilter: string): typeof DataStream {
        let ds: typeof DataStream = this.datastreams.find((ds) => ds.properties.name.includes(nameFilter))
        return ds;
    }

    lookupSystemIdFromDataStreamId(dsId: string): string {
        let stream: typeof DataStream = this.datastreams.find((ds) => ds.id === dsId);
        return this.systems.find((sys) => sys.properties.id === stream.properties["system@id"]).properties.id;
    }

    findDataStreamByObsProperty(obsProperty: string){
        let stream: typeof DataStream = this.datastreams.find((ds)=> {
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
    getDatastreamsForEventDetail(startTime: string, endTime: string): Map<string, typeof ConSysApi[]> {

        let dsMap: Map<string, typeof ConSysApi[]> = new Map();
        dsMap.set('occ', []);
        dsMap.set('gamma', []);
        dsMap.set('neutron', []);
        dsMap.set('tamper', []);
        dsMap.set('video', []);
        dsMap.set('gammaTrshld', []);
        
        for (let ds of this.datastreams) {

            let idx: number = this.datastreams.indexOf(ds);
            let datasourceReplay = this.createReplayConSysApiFromDataStream(ds, startTime, endTime);
            let datasourceBatch = this.createBatchConSysApiFromDataStream(ds, startTime, endTime);

            console.log("datasourceBatch", ds)
            // move some of this into another function to remove code redundancy
            if (isOccupancyDatastream(ds)) {
                let occArray = dsMap.get('occ')!;
                const index = occArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    occArray[index] = datasourceBatch;
                } else {
                    occArray.push(datasourceBatch);
                }
            }

            if(isGammaDatastream(ds)){
                let gammaArray = dsMap.get('gamma')!;
                const index = gammaArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    gammaArray[index] = datasourceBatch;
                } else {
                    gammaArray.push(datasourceBatch);
                }
            }

            if(isNeutronDatastream(ds)){
                let neutronArray = dsMap.get('neutron')!;
                const index = neutronArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    neutronArray[index] = datasourceBatch;
                } else {
                    neutronArray.push(datasourceBatch);
                }
            }

            if(isTamperDatastream(ds)){
                let tamperArray = dsMap.get('tamper')!;
                const index = tamperArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    tamperArray[index] = datasourceBatch;
                } else {
                    tamperArray.push(datasourceBatch);
                }
            }
            if(isVideoDatastream(ds)){
                let videoArray = dsMap.get('video')!;
                const index = videoArray.findIndex(dsItem => dsItem.properties.id === datasourceBatch.properties.id);

                if (index !== -1) {
                    videoArray[index] = datasourceBatch;
                } else {
                    videoArray.push(datasourceBatch);
                }
            }
            if(isThresholdDatastream(ds)){
                let gammaTrshldArray = dsMap.get('gammaTrshld')!;
                const index = gammaTrshldArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);

                if (index !== -1) {
                    gammaTrshldArray[index] = datasourceBatch;
                } else {
                    gammaTrshldArray.push(datasourceBatch);
                }
            }
        }
        return dsMap;
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
        let sysId: string = await this.parentNode.insertAdjSystem(adJSysJSON);
        console.log("[ADJ] Inserted Adjudication System: ", sysId);
        // let dsId = this.insertAdjudicationDataStream(laneName);
        return sysId;
    }

    async insertAdjudicationDataStream(systemId: string) {
        let dsRes = await this.parentNode.insertAdjDatastream(systemId);
        if (dsRes) {
            console.log("[ADJ] Inserted Adjudication Datastream: ", dsRes);
            this.adjDs = dsRes;
        }
    }

    async insertAdjudicationObservation(obsData: AdjudicationData) {
        let obsRes = await this.parentNode.insertObservation(obsData, this.adjDs);
        if (obsRes) {
            console.log("[ADJ] Inserted Adjudication Observation: ", obsRes);
        }
    }

    // addControlStreamId(id: string) {
    //     this.adjControlStreamId = id;
    // }
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
    connectionRT: typeof ConSysApi[];
    videoRT: typeof ConSysApi[];
    adjRT: typeof ConSysApi[];
    adjBatch: typeof ConSysApi[];


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
        this.adjRT = [];
        this.adjBatch = [];
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
        for (let ds of this[dsCollName] as typeof ConSysApi[]) {
            ds.subscribe(handler, [EventType.DATA]);
        }
    }

    connectAllDS() {
        for (let ds of this.occRT) {
            ds.connect();
        }
        for (let ds of this.occBatch) {
            ds.connect();
        }
        for (let ds of this.gammaRT) {
            ds.connect();
        }
        for (let ds of this.gammaBatch) {
            ds.connect();
        }
        for (let ds of this.neutronRT) {
            ds.connect();
        }
        for (let ds of this.neutronBatch) {
            ds.connect();
        }
        for (let ds of this.tamperRT) {
            ds.connect();
        }
        for (let ds of this.tamperBatch) {
            ds.connect();
        }
        for (let ds of this.locRT) {
            ds.connect();
        }
        for (let ds of this.locBatch) {
            ds.connect();
        }
        for (let ds of this.gammaTrshldBatch) {
            ds.connect();
        }
        for (let ds of this.gammaTrshldRT) {
            ds.connect();
        }
        for (let ds of this.connectionRT) {
            ds.connect();
        }
        for (let ds of this.videoRT) {
            ds.connect();
        }
        // console.info("Connecting all datasources of:", this);
    }
}
