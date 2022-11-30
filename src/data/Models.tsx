/*
 * Copyright (c) 2022.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

import {
    DEFAULT_API_ENDPOINT,
    DEFAULT_SOS_ENDPOINT,
    DEFAULT_SPS_ENDPOINT,
    DEFAULT_TIME_ID,
    REALTIME_END,
    REALTIME_START,
    ObservableType
} from "./Constants";
// @ts-ignore
import Layer from "osh-js/source/core/ui/layer/Layer";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource"
// @ts-ignore
import View from "osh-js/source/core/ui/view/View"
// @ts-ignore
import {randomUUID} from "osh-js/source/core/utils/Utils";

// Settings ==============================================================

export interface ISettings {
    useBuildingModels: boolean,
}

const SettingsProps: ISettings = {

    useBuildingModels: true,
}

export class Settings implements ISettings {

    useBuildingModels: boolean;

    constructor(props: ISettings = SettingsProps) {

        this.useBuildingModels = props.useBuildingModels;
    }
}

export interface IContextMenu {

    showMenu: boolean;
    top?: number;
    left?: number;
}

const ContextMenuProps: IContextMenu = {

    showMenu: false,
    top: undefined,
    left: undefined
}

export class ContextMenuState implements IContextMenu {

    showMenu: boolean;
    top: number;
    left: number;

    constructor(props: IContextMenu = ContextMenuProps) {

        this.showMenu = props.showMenu;
        this.top = (props.top) ? props.top : undefined;
        this.left = (props.left) ? props.left : undefined;
    }
}

// SensorHubServer ==============================================================
export interface ISensorHubServer {
    address: string,
    name: string,
    uniqueId: string,
    sosEndpoint: string,
    spsEndpoint: string,
    apiEndpoint: string,
    authToken: string,
    secure: boolean,
    systems: IPhysicalSystem[]
}

export const DefaultSensorHubServerProps: ISensorHubServer = {
    address: "",
    name: "",
    uniqueId: null,
    sosEndpoint: DEFAULT_SOS_ENDPOINT,
    spsEndpoint: DEFAULT_SPS_ENDPOINT,
    apiEndpoint: DEFAULT_API_ENDPOINT,
    authToken: "",
    secure: false,
    systems: [],
}

export class SensorHubServer implements ISensorHubServer {

    address: string;
    name: string;
    uniqueId: string;
    sosEndpoint: string;
    spsEndpoint: string;
    apiEndpoint: string;
    authToken: string;
    secure: boolean;
    systems: IPhysicalSystem[];

    constructor(props: ISensorHubServer = DefaultSensorHubServerProps) {
        this.address = props.address;
        this.name = props.name;
        this.uniqueId = props.uniqueId ? props.uniqueId : randomUUID();
        this.sosEndpoint = props.sosEndpoint;
        this.spsEndpoint = props.spsEndpoint;
        this.apiEndpoint = props.apiEndpoint;
        this.authToken = props.authToken;
        this.secure = props.secure || props.address.startsWith("https://");
        this.systems = props.systems;
    }
}

// TimePeriod =================================================================
export interface ITimePeriod {
    id: string,
    beginPosition: string,
    endPosition: string,
    isIndeterminateStart: boolean,
    isIndeterminateEnd: boolean,

    getTimeString?: ()=> string,

    getFormattedTime?: (time: number)=> string,

    getUtcFormattedTime?: (epochTime: number)=> string,

    getTimeSpanMillis?: ()=> number,

    getMaxTimeRange?: (timePeriods: TimePeriod[])=> TimePeriod
}

const timePeriodProps: ITimePeriod = {
    id: DEFAULT_TIME_ID,
    beginPosition: REALTIME_START,
    endPosition: REALTIME_END,
    isIndeterminateStart: true,
    isIndeterminateEnd: true
}

export class TimePeriod implements ITimePeriod {

    id: string;
    beginPosition: string;
    endPosition: string;
    isIndeterminateStart: boolean;
    isIndeterminateEnd: boolean;

    constructor(props: ITimePeriod = timePeriodProps) {

        this.id = props.id;
        this.beginPosition = props.beginPosition;
        this.endPosition = props.endPosition;
        this.isIndeterminateStart = props.isIndeterminateStart;
        this.isIndeterminateEnd = props.isIndeterminateEnd;
    }

    getTimeString(): string {

        return this.beginPosition + " - " + this.endPosition;
    }

    static getFormattedTime(time: number): string {

        return new Date(time).toISOString();
    }

    static getUtcFormattedTime(epochTime: number): string {

        return this.getFormattedTime(new Date(epochTime).getUTCDate());
    }

    static getEpochTime(time: string): number {

        return new Date(time).getTime();
    }

    static offsetTime(time: string, offset: number) {

        let epochTime = this.getEpochTime(time);

        epochTime += offset;

        return this.getFormattedTime(epochTime);
    }

    getTimeSpanMillis(): number {

        let millis: number = -1;

        if (!this.isIndeterminateEnd && !this.isIndeterminateStart) {

            millis = TimePeriod.getEpochTime(this.endPosition) - TimePeriod.getEpochTime(this.beginPosition);
        }

        return millis;
    }

    static getMaxTimeRange(timePeriods: ITimePeriod[]): ITimePeriod {

        let start: number = 0;
        let end: number = 0;

        for (let timePeriod of timePeriods) {

            if (!timePeriod.isIndeterminateStart) {

                let currentStart: number = TimePeriod.getEpochTime(timePeriod.beginPosition);
                let currentEnd: number = TimePeriod.getEpochTime(timePeriod.endPosition);

                start = (start == 0) ? currentStart : Math.min(start, currentStart);
                end = (end == 0) ? currentEnd : Math.max(end, currentEnd);
            }
        }

        return new TimePeriod({
            id: randomUUID(),
            beginPosition: TimePeriod.getFormattedTime(start),
            endPosition: TimePeriod.getFormattedTime(end),
            isIndeterminateStart: false,
            isIndeterminateEnd: false
        });
    }
}

// MasterTime =================================================================
export interface IMasterTime {
    masterTimePeriod: ITimePeriod,
    playbackTimePeriod: ITimePeriod,
    inPlaybackMode: boolean,

    updateMasterTime?: (phenomenonTime: ITimePeriod)=> void
}

const masterTimeProps: IMasterTime = {
    masterTimePeriod: new TimePeriod(),
    playbackTimePeriod: new TimePeriod(),
    inPlaybackMode: false
}

export class MasterTime implements IMasterTime {

    inPlaybackMode: boolean;
    masterTimePeriod: ITimePeriod;
    playbackTimePeriod: ITimePeriod;

    constructor(props: IMasterTime = masterTimeProps) {

        this.inPlaybackMode = props.inPlaybackMode;
        this.masterTimePeriod = props.masterTimePeriod;
        this.playbackTimePeriod = props.playbackTimePeriod;
    }

    updateMasterTime(phenomTime: ITimePeriod): void {

        let timePeriods: ITimePeriod[] = [];
        timePeriods.push(this.masterTimePeriod);
        timePeriods.push(phenomTime);
        this.masterTimePeriod = TimePeriod.getMaxTimeRange(timePeriods);
    }
}

// PhysicalSystemTime =========================================================
export interface IPhysicalSystemTime {
    timePeriod: ITimePeriod,

    updateSystemTime?: (phenomTime: ITimePeriod)=> void
}

const physicalSystemTimeProps: IPhysicalSystemTime = {
    timePeriod: new TimePeriod(),
}

export class PhysicalSystemTime implements IPhysicalSystemTime {

    timePeriod: ITimePeriod;

    constructor(props: IPhysicalSystemTime = physicalSystemTimeProps) {
        this.timePeriod = props.timePeriod;
    }

    updateSystemTime(phenomTime: ITimePeriod): void {

        let timePeriods: ITimePeriod[] = [];
        timePeriods.push(this.timePeriod);
        timePeriods.push(phenomTime);
        this.timePeriod = TimePeriod.getMaxTimeRange(timePeriods);
    }
}

// PhysicalSystem =============================================================
export interface IPhysicalSystem {
    name: string,
    serverUid: string,
    systemId: string,
    uuid: string,
    physicalSystemTime: IPhysicalSystemTime,
    observables: IObservable[]
}

const physicalSystemProps: IPhysicalSystem = {
    name: "",
    serverUid: "",
    systemId: "",
    uuid: randomUUID(),
    physicalSystemTime: new PhysicalSystemTime(),
    observables: []
}

export class PhysicalSystem implements IPhysicalSystem {

    name: string;
    physicalSystemTime: IPhysicalSystemTime;
    serverUid: string;
    systemId: string;
    uuid: string;
    observables: IObservable[];

    constructor(props: IPhysicalSystem = physicalSystemProps) {
        this.name = props.name;
        this.physicalSystemTime = props.physicalSystemTime;
        this.serverUid = props.serverUid;
        this.systemId = props.systemId;
        this.uuid = props.uuid;
        this.observables = props.observables;
    }
}

// Visualization ==============================================================
export interface IObservable {
    uuid: string,
    layers: Layer[],
    dataSources: SweApi[],
    name: string,
    physicalSystem: IPhysicalSystem,
    sensorHubServer: ISensorHubServer,
    histogram: number[];
    type: ObservableType,
    isConnected: boolean,

    connect?: ()=> void,

    disconnect?: ()=> void
}

const observableProps: IObservable = {
    uuid: randomUUID(),
    layers: [],
    dataSources: [],
    name: "",
    physicalSystem: null,
    sensorHubServer: null,
    histogram: [],
    type: ObservableType.PLI,
    isConnected: false
}

export class Observable implements IObservable {

    uuid: string;
    layers: Layer[];
    dataSources: SweApi[];
    name: string;
    physicalSystem: IPhysicalSystem;
    sensorHubServer: ISensorHubServer;
    histogram: number[];
    type: ObservableType;
    isConnected: boolean;

    constructor(props = observableProps) {
        this.uuid = props.uuid;
        this.layers = props.layers;
        this.dataSources = props.dataSources;
        this.name = props.name;
        this.physicalSystem = props.physicalSystem;
        this.sensorHubServer = props.sensorHubServer;
        this.histogram = props.histogram;
        this.type = props.type;
        this.isConnected = false;
    }

    connect() {
        for (let dataSource of this.dataSources) {

            dataSource.connect();
        }
    }

    disconnect() {
        for (let dataSource of this.dataSources) {

            dataSource.disconnect();
        }
    }
}

