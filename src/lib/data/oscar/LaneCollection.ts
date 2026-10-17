/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import System from "osh-js/source/core/consysapi/system/System.js";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {INode} from "@/lib/data/osh/Node";
import {Mode} from "osh-js/source/core/datasource/Mode";
import {EventType} from "osh-js/source/core/event/EventType";

type SharedConnectionState = {
    originalConnect: () => any;
    originalDisconnect: () => any;
    leases: Set<symbol>;
    legacyRequested: boolean;
    legacyRevision: number;
    connected: boolean;
    disposed: boolean;
    lifecycle: Promise<any>;
};

export type SharedConnectionLease = {
    ready: Promise<any>;
    release: () => Promise<any>;
};

const sharedConnectionStates = new WeakMap<object, SharedConnectionState>();

function wantsSharedConnection(state: SharedConnectionState): boolean {
    return !state.disposed && (state.legacyRequested || state.leases.size > 0);
}

/**
 * Serializes transport changes while reading the desired state at execution
 * time. Reading it late is important during React route hand-offs: a new view
 * can acquire the stream while the old view's release is waiting in the queue.
 */
function queueSharedConnection(
    state: SharedConnectionState,
    requestedState: () => boolean,
): Promise<any> {
    const transition = state.lifecycle.catch((): void => undefined).then(async () => {
        const shouldBeConnected = !state.disposed && requestedState();
        if (shouldBeConnected === state.connected)
            return;

        if (shouldBeConnected) {
            const result = await state.originalConnect();
            state.connected = true;
            return result;
        }

        const result = await state.originalDisconnect();
        state.connected = false;
        return result;
    });
    state.lifecycle = transition;
    return transition;
}

/**
 * Makes the datasource's legacy connect/disconnect pair idempotent and adds
 * support for explicit independent leases through acquireSharedConnection().
 * Cached lane datasources must use leases whenever more than one component can
 * display the same stream.
 */
export function manageSharedConnection(dataSource: any) {
    if (sharedConnectionStates.has(dataSource))
        return dataSource;

    const state: SharedConnectionState = {
        originalConnect: dataSource.connect.bind(dataSource),
        originalDisconnect: dataSource.disconnect.bind(dataSource),
        leases: new Set<symbol>(),
        legacyRequested: false,
        legacyRevision: 0,
        connected: false,
        disposed: false,
        lifecycle: Promise.resolve(),
    };
    sharedConnectionStates.set(dataSource, state);

    dataSource.connect = () => {
        if (state.disposed)
            return Promise.reject(new Error("Cannot connect a disposed realtime datasource"));
        if (state.legacyRequested)
            return state.lifecycle;
        state.legacyRequested = true;
        const legacyRevision = ++state.legacyRevision;
        let connect: Promise<any>;
        connect = queueSharedConnection(state, () => true).catch((error) => {
            // Lease transitions also replace state.lifecycle. Only a newer
            // legacy request should prevent this failed request from clearing
            // its ownership flag.
            if (!state.disposed && state.legacyRevision === legacyRevision)
                state.legacyRequested = false;
            throw error;
        });
        state.lifecycle = connect;
        return connect;
    };

    dataSource.disconnect = () => {
        if (state.disposed)
            return state.lifecycle;
        if (!state.legacyRequested)
            return state.lifecycle;
        state.legacyRequested = false;
        const legacyRevision = ++state.legacyRevision;
        let disconnect: Promise<any>;
        disconnect = queueSharedConnection(
            state,
            // A legacy disconnect must not consume another component's lease,
            // even if that lease was acquired after disconnect() was called.
            () => state.leases.size > 0,
        ).catch((error) => {
            if (!state.disposed && state.legacyRevision === legacyRevision)
                state.legacyRequested = true;
            throw error;
        });
        state.lifecycle = disconnect;
        return disconnect;
    };

    return dataSource;
}

/**
 * Acquires one independently releasable ownership token for a cached realtime
 * datasource. release() is idempotent, so React cleanup can safely run more
 * than once in development Strict Mode.
 */
export function acquireSharedConnection(dataSource: any): SharedConnectionLease {
    manageSharedConnection(dataSource);
    const state = sharedConnectionStates.get(dataSource)!;
    const token = Symbol("realtime datasource lease");
    let released = false;

    if (state.disposed) {
        return {
            ready: Promise.reject(new Error("Cannot acquire a disposed realtime datasource")),
            release: () => state.lifecycle,
        };
    }

    state.leases.add(token);
    const ready = queueSharedConnection(state, () => true);
    return {
        ready,
        release: () => {
            if (released)
                return state.lifecycle;
            released = true;
            state.leases.delete(token);
            const firstAttempt = queueSharedConnection(state, () => wantsSharedConnection(state));
            return firstAttempt.catch(() =>
                queueSharedConnection(state, () => wantsSharedConnection(state)));
        },
    };
}

/**
 * Permanently disposes a cached datasource even if a stale component still
 * holds a lease. Lane discovery uses this before replacing its cache; later
 * releases from the old component become harmless no-ops.
 */
export function disposeSharedConnection(dataSource: any): Promise<any> {
    const state = sharedConnectionStates.get(dataSource);
    if (!state)
        return Promise.resolve().then(() => dataSource.disconnect());
    if (!state.disposed) {
        state.disposed = true;
        state.legacyRevision++;
        state.legacyRequested = false;
        state.leases.clear();
    }

    // A transport can reject disconnect transiently. Keep the object disposed
    // but make one more serialized attempt so replacing a lane cache cannot
    // leave its MQTT connection alive forever. Calling this function again is
    // also safe and will reconcile the still-connected state.
    const firstAttempt = queueSharedConnection(state, () => false);
    return firstAttempt.catch(() => queueSharedConnection(state, () => false));
}

import {
    isAdjudicationControlStream,
    isConnectionDataStream,
    isGammaDataStream,
    isNeutronDataStream,
    isOccupancyDataStream,
    isRs350DataStream,
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
    datasources: typeof ConSysApi[];
    datasourcesBatch: typeof ConSysApi[];
    datasourcesRealtime: typeof ConSysApi[];
    parentNode: INode;
    laneSystem: typeof System;
    laneName: string;
    controlStreams: typeof ControlStream[]
    isRS350Backpack: boolean;

    constructor(node: INode) {
        this.systems = [];
        this.datastreams = [];
        this.datasources = [];
        this.datasourcesBatch = [];
        this.datasourcesRealtime = [];
        this.parentNode = node;
        this.laneName = undefined;
        this.controlStreams = [];
        this.isRS350Backpack = false;
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

    addDataStream(datastream: typeof DataStream) {
        this.datastreams.push(datastream);
    }

    addDataStreams(datastreams: typeof DataStream[]) {
        this.datastreams.push(...datastreams);
    }

    addDataSource(datasource: typeof ConSysApi) {
        this.datasources.push(datasource);
    }

    addDataSources(datasources: typeof ConSysApi[]) {
        this.datasources.push(...datasources);
    }

    setLaneName(name: string) {
        this.laneName = name;
    }

    addControlStream(controlStream: typeof ControlStream[]) {
        this.controlStreams.push(controlStream);
    }

    addControlStreams(controlStreams: typeof ControlStream[]) {
        this.controlStreams.push(...controlStreams)
    }

    setIsRS350Backpack(value: boolean) {
        this.isRS350Backpack = value;
    }

    resetDatasources() {
        for (let ds of this.datasourcesRealtime) {
            void disposeSharedConnection(ds).catch((error) => {
                console.warn("Unable to dispose realtime datasource", error);
            });
        }
        for (let ds of this.datasourcesBatch) {
            void Promise.resolve().then(() => ds.disconnect()).catch((error) => {
                console.warn("Unable to disconnect batch datasource", error);
            });
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


            let mqttOpts: any = {
                shared: true,
                prefix: this.parentNode.csAPIEndpoint,
                endpointUrl: mqttOptUrl,
            }
            if (this.parentNode.authenticationMode === "basic") {
                mqttOpts.username = this.parentNode.auth.username;
                mqttOpts.password = this.parentNode.auth.password;
            }

            try {
                let dsRT: typeof ConSysApi = null;
                let dsBatch: typeof ConSysApi = null;

                dsRT = new ConSysApi(`rtds - ${dsObj.properties.name}`, {
                    endpointUrl: dsObj.networkProperties.endpointUrl,
                    resource: `/datastreams/${dsObj.properties.id}/observations`,
                    tls: dsObj.networkProperties.tls,
                    protocol: 'mqtt',
                    mode: Mode.REAL_TIME,
                    responseFormat: isVideoDataStream(dsObj) ?'application/swe+binary' :  'application/swe+json',
                    mqttOpts: mqttOpts,
                });
                dsRT = manageSharedConnection(dsRT);

                dsBatch = new ConSysApi(`batchds - ${dsObj.properties.name}`, {
                    endpointUrl: dsObj.networkProperties.endpointUrl,
                    resource: `/datastreams/${dsObj.properties.id}/observations`,
                    tls: dsObj.networkProperties.tls,
                    protocol: 'mqtt',
                    mode: Mode.BATCH,
                    responseFormat: isVideoDataStream(dsObj) ?'application/swe+binary' :  'application/swe+json',
                    startTime: "2020-01-01T08:13:25.845Z",
                    endTime: "2055-01-01T08:13:25.845Z",
                    mqttOpts: mqttOpts,
                });

                rtArray.push(dsRT);
                batchArray.push(dsBatch);
            } catch (e) {
                console.error("[ERROR] Failed to create ConSysApi for datastream:", dsObj, "\nError:", e);
            }
        }

        this.datasourcesRealtime = rtArray;
        this.datasourcesBatch = batchArray;
    }

    createRealTimeConSysApi(stream: typeof DataStream | typeof ControlStream) {
        let mqttOptUrlArray = (stream.networkProperties.endpointUrl).split("/");
        let mqttOptUrl = mqttOptUrlArray[0] + "/" + mqttOptUrlArray[1];

        let mqttOpts: any = {
            shared: true,
            prefix: this.parentNode.csAPIEndpoint,
            endpointUrl: mqttOptUrl,
        }
        if (this.parentNode.authenticationMode === "basic") {
            mqttOpts.username = this.parentNode.auth.username;
            mqttOpts.password = this.parentNode.auth.password;
        }
        return new ConSysApi(`rtds - ${stream.properties.name}`, {
            endpointUrl: stream.networkProperties.endpointUrl,
            resource:  typeof stream == DataStream ? `/datastreams/${stream.properties.id}/observations` : `/controlstreams/${stream.properties.id}/status`,
            tls: stream.networkProperties.tls,
            protocol: 'mqtt',
            mode: Mode.REAL_TIME,
            responseFormat: 'application/json',
            mqttOpts: mqttOpts,
        });
    }

    createReplayConSysApiFromDataStream(datastream: typeof DataStream, startTime: string, endTime: string) {
        let mqttOptUrlArray = (datastream.networkProperties.endpointUrl).split("/");
        let mqttOptUrl = mqttOptUrlArray[0] + "/" + mqttOptUrlArray[1];

        let mqttOpts: any = {
            shared: true,
            prefix: this.parentNode.csAPIEndpoint,
            endpointUrl: mqttOptUrl,
        }
        if (this.parentNode.authenticationMode === "basic") {
            mqttOpts.username = this.parentNode.auth.username;
            mqttOpts.password = this.parentNode.auth.password;
        }
        return new ConSysApi(`rtds-${datastream.properties.id}`, {
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

        let mqttOpts: any = {
            shared: true,
            prefix: this.parentNode.csAPIEndpoint,
            endpointUrl: mqttOptUrl,
        }
        if (this.parentNode.authenticationMode === "basic") {
            mqttOpts.username = this.parentNode.auth.username;
            mqttOpts.password = this.parentNode.auth.password;
        }

        return new ConSysApi(`batchds-${datastream.properties.id}`, {
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

    findDataStreamByObsProperty(obsProperty: string) {
        let stream: typeof DataStream = this.datastreams.find((ds) => {
            let hasProp = ds.properties.observedProperties.some((prop: any) => prop.definition === obsProperty)
            return hasProp;
        });
        return stream;
    }

    findControlStreamByProperty() {
        let stream: typeof ControlStream = this.controlStreams.find((cs) => isAdjudicationControlStream(cs));
        return stream;
    }


    /**
     * Retrieves datastreams within the specified time range and categorizes them by event detail types.
     *
     * @param {number} startTime - The start time of the range for datastreams.
     * @param {number} endTime - The end time of the range for datastreams.
     * @return {Map<string, typeof ConSysApi[]>} A map categorizing the replayed datastreams by their event detail types.
     */
    async getDatastreamsForEventDetail(startTime: string, endTime: string): Promise<Map<string, typeof ConSysApi[]>> {

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

            if (isGammaDataStream(ds)) {
                let gammaArray = dsMap.get('gamma')!;
                gammaArray.push(datasourceBatch);
            }

            if (isNeutronDataStream(ds)) {
                let neutronArray = dsMap.get('neutron')!;
                neutronArray.push(datasourceBatch);
            }

            if (isTamperDataStream(ds)) {
                let tamperArray = dsMap.get('tamper')!;
                tamperArray.push(datasourceBatch);
            }

            if (isThresholdDataStream(ds)) {
                let gammaTrshldArray = dsMap.get('gammaTrshld')!;
                gammaTrshldArray.push(datasourceBatch);
            }

            if (isConnectionDataStream(ds)) {
                let connectionArray = dsMap.get('connection')!;
                connectionArray.push(datasourceBatch);
            }
        }
        return dsMap;
    }
}

/**
 * Returns the datastream ID encoded in an OSH datasource resource path.
 * Keeping this lookup in one place avoids relying on datastream and
 * datasource array order, which is not guaranteed by discovery responses.
 */
export function getRealtimeDataSourceStreamId(dataSource: any): string | undefined {
    const resource = dataSource?.properties?.resource;
    if (typeof resource !== "string")
        return undefined;

    const match = resource.match(/(?:^|\/)datastreams\/([^/?#]+)(?:\/|$)/);
    if (!match)
        return undefined;

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

export function findRealtimeDataSourceForStream(
    lane: Pick<LaneMapEntry, "datasourcesRealtime"> | null | undefined,
    datastream: typeof DataStream | null | undefined,
): typeof ConSysApi | undefined {
    const streamId = datastream?.properties?.id;
    if (!streamId)
        return undefined;

    return lane?.datasourcesRealtime?.find(
        (source: any) => getRealtimeDataSourceStreamId(source) === streamId,
    );
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
    n42RT: typeof ConSysApi[];
    n42Batch: typeof ConSysApi[];
    webIdBatch: typeof ConSysApi[];
    webIdRT: typeof ConSysApi[];

    backgroundRT: typeof ConSysApi[];
    backgroundBatch: typeof ConSysApi[];
    foregroundRT: typeof ConSysApi[];
    foregroundBatch: typeof ConSysApi[];

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
        this.connectionBatch = [];
        this.connectionRT = [];
        this.webIdRT = [];
        this.webIdBatch = [];
        this.n42Batch = [];
        this.n42RT = [];
        this.foregroundRT = [];
        this.foregroundBatch = [];
        this.backgroundBatch = [];
        this.backgroundRT = [];
    }

    getDSArray(propName: string): typeof ConSysApi[] {
        // @ts-ignore
        return this[propName];
    }

    getAllDSArrayNames(): string[] {
        return [
            'occBatch',
            'gammaBatch',
            'neutronBatch',
            'tamperBatch',
            'locBatch',
            'gammaTrshldBatch',
            'adjBatch',
            'connectionBatch',
            'n42Batch',
            'webIdBatch',
            'occRT',
            'gammaRT',
            'neutronRT',
            'tamperRT',
            'locRT',
            'gammaTrshldRT',
            'connectionRT',
            'adjRT',
            'webIdRT',
            'adjRT',
            'n42RT',
            'foregroundRT',
            'backgroundRT',
            'forgroundBatch',
            'backgroundBatch',
        ]
    }

    getBatchDSArrayNames(): string[] {
        return [
            'occBatch',
            'gammaBatch',
            'neutronBatch',
            'tamperBatch',
            'locBatch',
            'gammaTrshldBatch',
            'adjBatch',
            'connectionBatch',
            'n42Batch',
            'forgroundBatch',
            'backgroundBatch',
            'n42Batch',
            'webIdBatch',
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
            'adjRT',
            'webIdRT',
            'adjRT',
            'n42RT',
            'foregroundRT',
            'backgroundRT',
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

    addSubscriptionToDS(dsArrayNames: string[], handler: Function) {
        for (const name of dsArrayNames) {
            const dsArray = this.getDSArray(name);
            for (const ds of dsArray) {
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
        if (!this) return;
        this.addSubscriptionToDS([dsCollName], handler);
    }

    async connectToDS(dsArrayNames: string[]) {
        for (const name of dsArrayNames) {
            const dsArray = this.getDSArray(name);
            for (const ds of dsArray) {
                await ds.connect()
            }
        }
    }

    async disconnectToDS(dsArrayNames: string[]) {
        for (const name of dsArrayNames) {
            const dsArray = this.getDSArray(name);
            for (const ds of dsArray) {
                await ds.disconnect()
            }
        }
    }

    async addConnectToALLDSMatchingName(dsCollName: string) {
        if (!this) return;
        await this.connectToDS([dsCollName]);
    }

    async addDisconnectToALLDSMatchingName(dsCollName: string) {
        if (!this) return;
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
