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
    ITimePeriod,
    MasterTime,
    Settings,
    TimePeriod
} from "../data/Models";
import {RootState} from "./Store";

import {
    DEFAULT_TIME_ID,
    ObservableType,
    PlaybackState,
    REALTIME_END,
    REALTIME_FUTURE_END,
    REALTIME_START
} from "../data/Constants";

// @ts-ignore
import MapView from "osh-js/source/core/ui/view/map/MapView";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer"
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

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
    sensorHubServers: ISensorHubServer[],
    physicalSystems: IPhysicalSystem[],
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
    sensorHubServers: [],
    physicalSystems: [],
    observables: new Map<string, IObservable>(),

    dataSynchronizer: new DataSynchronizer({
        startTime: REALTIME_START,
        endTime: REALTIME_END,
        replaySpeed: 1,
        intervalRate: 5,
        dataSources: []
    }),
    dataSynchronizerReplaySpeed: 1,
    playbackState: PlaybackState.PAUSE,

    connectedObservables: new Map<string, boolean>(),
    dataLayersConnectedState: new Map<ObservableType, boolean>([
        [ObservableType.PLI, false],
        [ObservableType.VIDEO, false],
        [ObservableType.IMAGE, false],
        [ObservableType.DRAPING, false],
        [ObservableType.LOB, false],
        [ObservableType.AOI, false],
        [ObservableType.CHART, false],
        [ObservableType.TARGET, false],
        [ObservableType.SIGINT, false]
    ])
};

export const Slice = createSlice({
    name: 'AppStateSlice',
    initialState,
    reducers: {

        // App Initialization ******************************************************************************************
        setAppInitialized: ((state, action: PayloadAction<boolean>) => {

            state.initialized = action.payload;

            let initializeTimeRange = async function (dataSynchronizer: DataSynchronizer) {

                let promises = [];

                promises.push(dataSynchronizer.setTimeRange(REALTIME_START, REALTIME_END, 1));

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
            state.sensorHubServers.push(action.payload);
        }),

        removeSensorHubServer: ((state, action: PayloadAction<ISensorHubServer>) => {

            state.sensorHubServers = state.sensorHubServers.filter(value => {
                // @ts-ignore

                return value !== action.payload
            });
        }),

        // Systems *****************************************************************************************************
        addPhysicalSystem: ((state, action: PayloadAction<IPhysicalSystem>) => {

            // @ts-ignore
            state.physicalSystems.push(action.payload);
        }),

        removePhysicalSystem: ((state, action: PayloadAction<IPhysicalSystem>) => {

            state.physicalSystems = state.physicalSystems.filter(value => {

                // @ts-ignore
                return value !== action.payload
            });
        }),

        // Observables *************************************************************************************************
        addObservable: ((state, action: PayloadAction<IObservable>) => {

            state.observables.set(action.payload.uuid, action.payload);

            state.masterTime.updateMasterTime(action.payload.physicalSystem.physicalSystemTime.timePeriod);
        }),

        removeObservable: ((state, action: PayloadAction<IObservable>) => {

            if (action.payload.isConnected) {

                action.payload.disconnect();

                action.payload.isConnected = false;

                if ((action.payload.type !== ObservableType.VIDEO) &&
                    (action.payload.type !== ObservableType.CHART)) {

                    for (let layer of action.payload.layers) {

                        // If the layer data can be cleared
                        if (layer.clear !== undefined) {

                            // Clear the layers data
                            layer.clear();
                        }

                        state.mapView.removeAllFromLayer(layer);
                    }
                }
            }

            state.observables.delete(action.payload.uuid);
            state.connectedObservables.delete(action.payload.uuid);
        }),

        showObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (observable != undefined) {

                if ((observable.type !== ObservableType.VIDEO) &&
                    (observable.type !== ObservableType.CHART)) {

                    for (let layer of observable.layers) {

                        state.mapView.addLayer(layer);
                    }
                }
            }
        }),

        hideObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (observable != undefined) {

                if ((observable.type !== ObservableType.VIDEO) &&
                    (observable.type !== ObservableType.CHART)) {

                    for (let layer of observable.layers) {

                        // If the layer data can be cleared
                        if (layer.clear !== undefined) {

                            // Clear the layers data
                            layer.clear();
                        }

                        layer.reset();

                        state.mapView.removeAllFromLayer(layer);
                    }
                }
            }
        }),

        connectObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (state.masterTime.inPlaybackMode === false) {

                if (!observable.isConnected) {

                    observable.connect();
                }

            } else {

                state.dataSynchronizer.disconnect();

                state.dataSynchronizer = new DataSynchronizer({
                    startTime: state.masterTime.playbackTimePeriod.beginPosition,
                    endTime: state.masterTime.playbackTimePeriod.endPosition,
                    replaySpeed: state.dataSynchronizerReplaySpeed,
                    intervalRate: 5,
                    dataSources: [...state.dataSynchronizer.dataSources, ...observable.dataSources],
                    mode: Mode.REPLAY
                });

                if (state.playbackState === PlaybackState.PLAY) {

                    state.dataSynchronizer.connect();
                }
            }

            observable.isConnected = true;
            state.connectedObservables.set(observable.uuid, true);
        }),

        disconnectObservable: ((state, action: PayloadAction<IObservable>) => {

            // @ts-ignore
            let observable: IObservable = state.observables.get(action.payload.uuid);

            if (state.masterTime.inPlaybackMode === false) {

                if (observable.isConnected) {

                    observable.disconnect();
                }

            } else {

                state.dataSynchronizer.disconnect();

                let keepDataSources: SweApi[] =
                    state.dataSynchronizer.dataSources.filter((ds: SweApi) => observable.dataSources.indexOf(ds) < 0);

                state.dataSynchronizer = new DataSynchronizer({
                    startTime: state.masterTime.playbackTimePeriod.beginPosition,
                    endTime: state.masterTime.playbackTimePeriod.endPosition,
                    replaySpeed: state.dataSynchronizerReplaySpeed,
                    intervalRate: 5,
                    dataSources: [...keepDataSources],
                    mode: Mode.REPLAY
                });

                if (state.dataSynchronizer.dataSources.length === 0 ){

                    state.playbackState = PlaybackState.PAUSE;
                }

                if (state.playbackState === PlaybackState.PLAY) {

                    state.dataSynchronizer.connect();
                }
            }

            observable.isConnected = false;
            state.connectedObservables.set(observable.uuid, false);
        }),

        // RealTime vs. Playback ***************************************************************************************
        setPlaybackMode: ((state, action: PayloadAction<boolean>) => {

            state.masterTime = new MasterTime({
                masterTimePeriod: state.masterTime.masterTimePeriod,
                playbackTimePeriod: state.masterTime.playbackTimePeriod,
                inPlaybackMode: action.payload
            });

            state.observables.forEach(observable => {

                if (observable.isConnected) {

                    observable.disconnect();
                    state.connectedObservables.set(observable.uuid, false);
                    observable.isConnected = false;

                    if ((observable.type !== ObservableType.VIDEO) &&
                        (observable.type !== ObservableType.CHART)) {

                        for (let layer of observable.layers) {

                            // If the layer data can be cleared
                            if (layer.clear !== undefined) {

                                // Clear the layers data
                                layer.clear();
                            }

                            layer.reset();

                            state.mapView.removeAllFromLayer(layer);
                        }
                    }
                }
            });

            if (!state.masterTime.inPlaybackMode) {

                state.observables.forEach(observable => {

                    for (let dataSource of observable.dataSources) {

                        dataSource.setTimeRange(REALTIME_START, REALTIME_FUTURE_END, 1, false);
                    }
                });
            }
        }),

        updatePlaybackTimePeriod: ((state, action: PayloadAction<string>) => {

            state.masterTime = new MasterTime({
                inPlaybackMode: state.masterTime.inPlaybackMode,
                masterTimePeriod: state.masterTime.masterTimePeriod,
                playbackTimePeriod: new TimePeriod({
                    id: DEFAULT_TIME_ID,
                    beginPosition: action.payload,
                    endPosition: REALTIME_FUTURE_END,
                    isIndeterminateEnd: false,
                    isIndeterminateStart: false
                })
            });

            let updateTimeRange = async function (dataSynchronizer: DataSynchronizer, timePeriod: ITimePeriod, speed: number) {

                await dataSynchronizer.setTimeRange(timePeriod.beginPosition, timePeriod.endPosition, speed, false);
            }

            updateTimeRange(state.dataSynchronizer, state.masterTime.playbackTimePeriod, state.dataSynchronizerReplaySpeed).then();
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
    removePhysicalSystem,

    addObservable,
    removeObservable,
    showObservable,
    hideObservable,
    connectObservable,
    disconnectObservable,

    setPlaybackMode,
    updatePlaybackTimePeriod,
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