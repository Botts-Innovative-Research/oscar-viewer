/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {pink} from "@mui/material/colors";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {GammaScanData, NeutronScanData, SweApiMessage} from "types/message-types";
import Systems from "osh-js/source/core/sweapi/system/Systems.js";
import System from "osh-js/source/core/sweapi/system/System.js";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream.js";
import {INode} from "@/lib/data/osh/Node";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";
import {IDatastream} from "@/lib/data/osh/Datastreams";

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

    constructor(node: INode) {
        this.systems = [];
        this.datastreams = [];
        this.datasources = [];
        this.datasourcesBatch = [];
        this.datasourcesRealtime = [];
        this.parentNode = node;
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

    addDefaultSWEAPIs() {
        for (let dsObj of this.datastreams) {

            let dsRT = new SweApi(`rtds - ${dsObj.properties.name}`, {
                protocol: dsObj.networkProperties.streamProtocol,
                endpointUrl: dsObj.networkProperties.endpointUrl,
                resource: `/datastreams/${dsObj.properties.id}/observations`,
                tls: dsObj.networkProperties.tls,
                responseFormat: dsObj.properties.outputName === "video" ? 'application/swe+binary' : 'application/swe+json',
                mode: Mode.REAL_TIME,
                connectorOpts: {
                    username: this.parentNode.auth.username,
                    password: this.parentNode.auth.password
                }
            });

            let dsBatch = new SweApi(`batchds - ${dsObj.properties.name}`, {
                protocol: dsObj.networkProperties.streamProtocol,
                endpointUrl: dsObj.networkProperties.endpointUrl,
                resource: `/datastreams/${dsObj.properties.id}/observations`,
                tls: dsObj.networkProperties.tls,
                responseFormat: dsObj.properties.outputName === "video" ? 'application/swe+binary' : 'application/swe+json',
                mode: Mode.BATCH,
                connectorOpts: {
                    username: this.parentNode.auth.username,
                    password: this.parentNode.auth.password
                },
                startTime: "2020-01-01T08:13:25.845Z",
                endTime: new Date((new Date().getTime() - 1000000)).toISOString()

            });

            // this.datasources.push([dsRT, dsBatch]);
            this.datasourcesRealtime.push(dsRT);
            this.datasourcesBatch.push(dsBatch);
        }
    }

    createReplaySweApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        return new SweApi(`rtds-${datastream.properties.id}`, {
            protocol: datastream.networkProperties.streamProtocol,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: datastream.properties.outputName === "video" ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.REPLAY,
            connectorOpts: {
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password
            },
            startTime: startTime,
            endTime: endTime
        });
    }

    createBatchSweApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        return new SweApi(`batchds-${datastream.properties.id}`, {
            protocol: datastream.networkProperties.streamProtocol,
            endpointUrl: datastream.networkProperties.endpointUrl,
            resource: `/datastreams/${datastream.properties.id}/observations`,
            tls: datastream.networkProperties.tls,
            responseFormat: datastream.properties.outputName === "video" ? 'application/swe+binary' : 'application/swe+json',
            mode: Mode.BATCH,
            connectorOpts: {
                username: this.parentNode.auth.username,
                password: this.parentNode.auth.password
            },
            startTime: startTime,
            endTime: endTime
        });
    }

    lookupSystemIdFromDataStreamId(dsId: string) {
        let stream = this.datastreams.find((ds) => ds.id === dsId);
        return this.systems.find((sys) => sys.properties.id === stream.properties["system@id"]).properties.id;
    }


    /**
     * Retrieves datastreams within the specified time range and categorizes them by event detail types.
     *
     * @param {number} startTime - The start time of the range for datastreams.
     * @param {number} endTime - The end time of the range for datastreams.
     * @return {Map<string, typeof SweApi[]>} A map categorizing the replayed datastreams by their event detail types.
     */
    getDatastreamsForEventDetail(startTime: string, endTime: string): Map<string, typeof SweApi[]> {

        let dsMap: Map<string, typeof SweApi[]> = new Map();
        dsMap.set('occ', []);
        dsMap.set('gamma', []);
        dsMap.set('neutron', []);
        dsMap.set('tamper', []);
        dsMap.set('video', []);
        dsMap.set('gammaTrshld', []);

        for (let ds of this.datastreams) {

            let idx: number = this.datastreams.indexOf(ds);
            let datasourceReplay = this.createReplaySweApiFromDataStream(ds, startTime, endTime);
            let datasourceBatch = this.createBatchSweApiFromDataStream(ds, startTime, endTime);

            // move some of this into another function to remove code redundancy
            if (ds.properties.name.includes('Driver - Occupancy')) {
                let occArray = dsMap.get('occ')!;
                const index = occArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    occArray[index] = datasourceBatch;
                } else {
                    occArray.push(datasourceBatch);
                }
            }
            if (ds.properties.name.includes('Driver - Gamma Count')) {
                let gammaArray = dsMap.get('gamma')!;
                const index = gammaArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    gammaArray[index] = datasourceBatch;
                } else {
                    gammaArray.push(datasourceBatch);
                }
            }
            if (ds.properties.name.includes('Driver - Neutron Count')) {
                let neutronArray = dsMap.get('neutron')!;
                const index = neutronArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    neutronArray[index] = datasourceBatch;
                } else {
                    neutronArray.push(datasourceBatch);
                }
            }
            if (ds.properties.name.includes('Driver - Tamper')) {
                let tamperArray = dsMap.get('tamper')!;
                const index = tamperArray.findIndex(dsItem => dsItem.properties.name === datasourceBatch.properties.name);
                if (index !== -1) {
                    tamperArray[index] = datasourceBatch;
                } else {
                    tamperArray.push(datasourceBatch);
                }
            }
            if (ds.properties.name.includes('Video')) {
                let videoArray = dsMap.get('video')!;
                const index = videoArray.findIndex(dsItem => dsItem.properties.name === datasourceReplay.properties.name);
                if (index !== -1) {
                    videoArray[index] = datasourceReplay;
                } else {
                    videoArray.push(datasourceReplay);
                }
            }
            if (ds.properties.name.includes('Driver - Gamma Threshold')) {
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
}

export class LaneDSColl {
    occRT: typeof SweApi[];
    occBatch: typeof SweApi[];
    gammaRT: typeof SweApi[];
    gammaBatch: typeof SweApi[];
    neutronRT: typeof SweApi[];
    neutronBatch: typeof SweApi[];
    tamperRT: typeof SweApi[];
    tamperBatch: typeof SweApi[];
    locRT: typeof SweApi[];
    locBatch: typeof SweApi[];

    constructor() {
        this.occRT = [];
        this.occBatch = [];
        this.gammaRT = [];
        this.gammaBatch = [];
        this.neutronRT = [];
        this.neutronBatch = [];
        this.tamperRT = [];
        this.tamperBatch = [];
        this.locBatch =[];
        this.locRT =[];
    }

    getDSArray(propName: string): typeof SweApi[] {
        // @ts-ignore
        return this[propName];
    }

    addDS(propName: string, ds: typeof SweApi) {
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
        for( let ds of this.locBatch){
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
        for (let ds of this.locRT){
            ds.subscribe(handler, [EventType.DATA]);
        }
    }

    [key: string]: typeof SweApi[] | Function;

    addSubscribeHandlerToALLDSMatchingName(dsCollName: string, handler: Function) {
        for (let ds of this[dsCollName] as typeof SweApi[]) {
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
        for (let ds of this.locRT){
            ds.connect();
        }
        for (let ds of this.locBatch){
            ds.connect();
        }
    }
}
