/*
 * Copyright (c) 2022-2024.  Botts Innovative Research, Inc.
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

// @ts-ignore
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {enableMapSet} from 'immer';

import {
    ContextMenuState,
    IContextMenu,
    IMasterTime,
    IObservable,
    IPhysicalSystem,
    ISensorHubServer,
    ISettings,
    MasterTime,
    Settings,
    TimePeriod
} from "../data/Models";
import {RootState} from "./Store";

import {
    DEFAULT_TIME_ID,
    ObservableType,
    PlaybackState,
    END_TIME,
    FUTURE_END_TIME,
    START_TIME
} from "../data/Constants";

// @ts-ignore
import MapView from "osh-js/source/core/ui/view/map/MapView";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer"
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer"

enableMapSet();

interface IAppState {

    initialized: boolean,

    settings: ISettings,
    contextMenuState: IContextMenu,

    settingsDialogOpen: boolean,
    serverManagementDialogOpen: boolean,
    addServerDialogOpen: boolean,
    observablesDialogOpen: boolean,
    systemsDialogOpen: boolean,

    mapView: MapView,

    masterTime: IMasterTime,
    sensorHubServers: Map<string, ISensorHubServer>,
    physicalSystems: Map<string, IPhysicalSystem>,
    observables: Map<string, IObservable>,

    dataSynchronizer: DataSynchronizer,
    dataSynchronizerReplaySpeed: number,
    playbackState: PlaybackState,

    connectedObservables: Map<string, boolean>,
    dataLayersConnectedState: Map<ObservableType, boolean>
}

const initialState: IAppState = {

    initialized: false,

    settings: new Settings(),
    contextMenuState: new ContextMenuState(),

    settingsDialogOpen: false,
    serverManagementDialogOpen: false,
    addServerDialogOpen: false,
    observablesDialogOpen: false,
    systemsDialogOpen: false,

    mapView: typeof MapView,

    masterTime: new MasterTime(),
    sensorHubServers: new Map<string, ISensorHubServer>(),
    physicalSystems: new Map<string, IPhysicalSystem>(),
    observables: new Map<string, IObservable>(),

    dataSynchronizer: new DataSynchronizer({
        startTime: START_TIME,
        endTime: END_TIME,
        replaySpeed: 1,
        intervalRate: 5,
        dataSources: [],
        mode: Mode.REPLAY
    }),
    dataSynchronizerReplaySpeed: 1,
    playbackState: PlaybackState.PAUSE,

    connectedObservables: new Map<string, boolean>(),
    dataLayersConnectedState: new Map<ObservableType, boolean>([
        [ObservableType.PLI, false],
        [ObservableType.VIDEO, false],
        [ObservableType.DRAPING, false],
    ])
};

export const Slice = createSlice({
    name: 'AppStateSlice',
    initialState,
    reducers: {

        // App Initialization ******************************************************************************************
        setAppInitialized: ((state, action: PayloadAction<boolean>) => {

            state.initialized = action.payload;

            state.masterTime.inPlaybackMode = true;

            let initializeTimeRange = async function (dataSynchronizer: DataSynchronizer) {

                let promises = [];

                promises.push(dataSynchronizer.setTimeRange(START_TIME, END_TIME, 1, false));
                promises.push(dataSynchronizer.setMode(Mode.REPLAY));

                await Promise.all(promises).then(
                    () => {
                    },
                    (reason) => {
                        console.error(reason)
                    });
            }

            initializeTimeRange(state.dataSynchronizer).then();
        }),

        // Settings *****************************************************************************************************
        setUseBuildingModels: ((state, action: PayloadAction<boolean>) => {

            state.settings = new Settings({
                useBuildingModels: action.payload,
            });
        }),

        updateContextMenuState: ((state, action: PayloadAction<{ showMenu: boolean, top?: number, left?: number }>) => {

            state.contextMenuState = new ContextMenuState(action.payload);
        }),

        // Dialogs *****************************************************************************************************
        setSettingsDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.settingsDialogOpen = action.payload;
        }),

        setServerManagementDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.serverManagementDialogOpen = action.payload;
        }),

        setAddServerDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.addServerDialogOpen = action.payload;
        }),

        setObservablesDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.observablesDialogOpen = action.payload;
        }),

        setSystemsDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.systemsDialogOpen = action.payload;
        }),

        // Map *********************************************************************************************************
        setMapView: ((state, action: PayloadAction<typeof MapView>) => {

            state.mapView = action.payload;
        }),

        // Servers *****************************************************************************************************
        addSensorHubServer: ((state, action: PayloadAction<ISensorHubServer>) => {

            // @ts-ignore
            state.sensorHubServers.set(action.payload.uuid, action.payload);
        }),

        removeSensorHubServer: ((state, action: PayloadAction<ISensorHubServer>) => {

            action.payload.systems.forEach((system: IPhysicalSystem) => {

                system.observables.forEach((observable: IObservable) => {

                    if (observable.isConnected) {

                        observable.disconnect();

                        if (observable.type !== ObservableType.VIDEO) {

                            for (let layer of observable.layers) {

                                if (!(layer instanceof VideoDataLayer)) {

                                    state.mapView.removeAllFromLayer(layer);
                                }
                            }
                        }
                    }

                    state.observables.delete(observable.uuid);
                    state.connectedObservables.delete(observable.uuid);
                })

                state.physicalSystems.delete(system.uuid);
            });

            state.sensorHubServers.delete(action.payload.uuid);
        }),

        // Systems *****************************************************************************************************
        addPhysicalSystem: ((state, action: PayloadAction<IPhysicalSystem>) => {

            // @ts-ignore
            state.physicalSystems.set(action.payload.uuid, action.payload);
        }),

        // Observables *************************************************************************************************
        addObservable: ((state, action: PayloadAction<IObservable>) => {

            state.observables.set(action.payload.uuid, action.payload);

            state.masterTime.updateMasterTime(action.payload.physicalSystem.physicalSystemTime.timePeriod);
        }),

        showObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (observable != undefined) {

                if (observable.type !== ObservableType.VIDEO) {

                    for (let layer of observable.layers) {

                        if (!(layer instanceof VideoDataLayer)) {

                            state.mapView.addLayer(layer);
                        }
                    }
                }
            }
        }),

        hideObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (observable != undefined) {

                if (observable.type !== ObservableType.VIDEO) {

                    for (let layer of observable.layers) {

                        if (!(layer instanceof VideoDataLayer)) {

                            state.mapView.removeAllFromLayer(layer);
                        }
                    }
                }
            }
        }),

        connectObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            let updateDataSources = async (dataSynchronizer: DataSynchronizer, observable: IObservable) => {

                await dataSynchronizer.disconnect();

                console.info("Connect -> DS " + dataSynchronizer.getId() + " count: " + dataSynchronizer.getDataSources().length);

                for (let dataSource of observable.dataSources) {

                    await dataSynchronizer.addDataSource(dataSource);
                }

                console.info("Connect -> DS " + dataSynchronizer.getId() + " count: " + dataSynchronizer.getDataSources().length);
            }

            updateDataSources(state.dataSynchronizer, observable).then()

            observable.isConnected = true;

            state.connectedObservables.set(observable.uuid, true);

            state.dataSynchronizer.reset();

            if (state.playbackState === PlaybackState.PLAY) {

                state.dataSynchronizer.connect();
            }
        }),

        disconnectObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            let updateDataSources = async (dataSynchronizer: DataSynchronizer, observable: IObservable) => {

                await dataSynchronizer.disconnect();

                console.info("Disconnect -> DS " + dataSynchronizer.getId() + " count: " + dataSynchronizer.getDataSources().length);

                for (let dataSource of observable.dataSources) {

                    await dataSynchronizer.removeDataSource(dataSource);
                }

                console.info("Disconnect -> DS " + dataSynchronizer.getId() + " count: " + dataSynchronizer.getDataSources().length);
            }

            updateDataSources(state.dataSynchronizer, observable).then()

            observable.isConnected = false;

            state.connectedObservables.set(observable.uuid, false);

            if (state.dataSynchronizer.getDataSources().length === 0) {

                state.playbackState = PlaybackState.PAUSE;
            }

            if (state.playbackState === PlaybackState.PLAY) {

                state.dataSynchronizer.connect();
            }
        }),

        // RealTime vs. Playback ***************************************************************************************
        setPlaybackMode: ((state, action: PayloadAction<boolean>) => {

            state.masterTime = new MasterTime({
                masterTimePeriod: state.masterTime.masterTimePeriod,
                playbackTimePeriod: state.masterTime.playbackTimePeriod,
                inPlaybackMode: action.payload
            });

            let dataSources: SweApi[] = [];

            state.observables.forEach(observable => {

                if (observable.isConnected) {

                    dataSources.push(...observable.dataSources);

                    observable.disconnect();
                    state.connectedObservables.set(observable.uuid, false);
                    observable.isConnected = false;

                    if (observable.type !== ObservableType.VIDEO) {

                        for (let layer of observable.layers) {

                            if (!(layer instanceof VideoDataLayer)) {

                                state.mapView.removeAllFromLayer(layer);
                            }
                        }
                    }
                }
            });

            let updateDataSources = async (dataSynchronizer: DataSynchronizer, dataSources: SweApi[]) => {

                await dataSynchronizer.disconnect();

                for (let dataSource of dataSources) {

                    await dataSynchronizer.removeDataSource(dataSource);
                }
            }

            updateDataSources(state.dataSynchronizer, dataSources).then()

            let updatePlaybackMode = async (dataSynchronizer: DataSynchronizer, inPlaybackMode: boolean) => {

                if (dataSynchronizer.getDataSources().length > 0) {

                   await dataSynchronizer.disconnect();
                }

                let mode: Mode = Mode.REAL_TIME;

                if (inPlaybackMode) {

                    mode = Mode.REPLAY;
                }

                await dataSynchronizer.setMode(mode);
            }

            updatePlaybackMode(state.dataSynchronizer, state.masterTime.inPlaybackMode).then();
        }),

        updatePlaybackStartTime: ((state, action: PayloadAction<string>) => {

            state.masterTime = new MasterTime({
                inPlaybackMode: state.masterTime.inPlaybackMode,
                masterTimePeriod: state.masterTime.masterTimePeriod,
                playbackTimePeriod: new TimePeriod({
                    id: DEFAULT_TIME_ID,
                    beginPosition: action.payload,
                    endPosition: FUTURE_END_TIME,
                    isIndeterminateEnd: false,
                    isIndeterminateStart: false
                })
            });

            let updateTimeRange = async function (dataSynchronizer: DataSynchronizer, time: IMasterTime, speed: number) {

                console.log("New ST = " + time.playbackTimePeriod.beginPosition);

                for (let dataSource of dataSynchronizer.getDataSources()) {

                    dataSource.setMinTime(time.playbackTimePeriod.beginPosition);
                }

                await dataSynchronizer.setTimeRange(time.playbackTimePeriod.beginPosition, time.playbackTimePeriod.endPosition, speed, false);

                console.log("After Set = " + dataSynchronizer.getStartTimeAsIsoDate());
            }

            updateTimeRange(state.dataSynchronizer, state.masterTime, state.dataSynchronizerReplaySpeed).then();
        }),

        updatePlaybackSpeed: ((state, action: PayloadAction<number>) => {

            state.dataSynchronizerReplaySpeed = action.payload;

            let updateSpeed = async function (dataSynchronizer: DataSynchronizer, speed: number) {

                await dataSynchronizer.setReplaySpeed(speed);
            }

            updateSpeed(state.dataSynchronizer, state.dataSynchronizerReplaySpeed).then();
        }),

        startPlayback: ((state) => {

            state.playbackState = PlaybackState.PLAY;

            let start = async function (dataSynchronizer: DataSynchronizer) {

                await dataSynchronizer.connect();
            }

            start(state.dataSynchronizer).then();
        }),

        pausePlayback: ((state) => {

            state.playbackState = PlaybackState.PAUSE;

            let pause = async function (dataSynchronizer: DataSynchronizer) {

                await dataSynchronizer.disconnect();
            }

            pause(state.dataSynchronizer).then();
        }),
    },
})

export const {

    setAppInitialized,

    setUseBuildingModels,

    updateContextMenuState,

    setSettingsDialogOpen,
    setServerManagementDialogOpen,
    setAddServerDialogOpen,
    setObservablesDialogOpen,
    setSystemsDialogOpen,

    setMapView,

    addSensorHubServer,
    removeSensorHubServer,

    addPhysicalSystem,

    addObservable,
    showObservable,
    hideObservable,
    connectObservable,
    disconnectObservable,

    setPlaybackMode,
    updatePlaybackStartTime,
    updatePlaybackSpeed,
    startPlayback,
    pausePlayback,

} = Slice.actions;

export const selectAppInitialized = (state: RootState) => state.appState.initialized

export const selectUseBuildingModels = (state: RootState) => state.appState.settings.useBuildingModels

export const selectContextMenuState = (state: RootState) => state.appState.contextMenuState

export const selectSettingsDialogOpen = (state: RootState) => state.appState.settingsDialogOpen
export const selectServerManagementDialogOpen = (state: RootState) => state.appState.serverManagementDialogOpen
export const selectAddServerDialogOpen = (state: RootState) => state.appState.addServerDialogOpen
export const selectObservablesDialogOpen = (state: RootState) => state.appState.observablesDialogOpen
export const selectSystemsDialogOpen = (state: RootState) => state.appState.systemsDialogOpen

export const selectServers = (state: RootState) => state.appState.sensorHubServers
export const selectPhysicalSystems = (state: RootState) => state.appState.physicalSystems
export const selectObservables = (state: RootState) => state.appState.observables

export const selectMasterTime = (state: RootState) => state.appState.masterTime
export const selectDataSynchronizer = (state: RootState) => state.appState.dataSynchronizer
export const selectConnectedObservables = (state: RootState) => state.appState.connectedObservables
export const selectPlaybackState = (state: RootState) => state.appState.playbackState
export const selectPlaybackMode = (state: RootState) => state.appState.masterTime.inPlaybackMode
export const selectPlaybackSpeed = (state: RootState) => state.appState.dataSynchronizerReplaySpeed


export default Slice.reducer;