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
                showTrails: state.settings.showTrails
            });
        }),

        setShowTrails: ((state, action: PayloadAction<boolean>) => {

            state.settings = new Settings({
                useBuildingModels: state.settings.useBuildingModels,
                showTrails: action.payload
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

                let startTime = state.masterTime.playbackTimePeriod.beginPosition;

                let addDataSources = async function (
                    dataSynchronizer: DataSynchronizer, observable: IObservable,
                    startTime: string, endTime: string, playbackState: PlaybackState) {

                    // DataSynchronizer reports 'true' on isConnected if there are no dataSources
                    // if (dataSynchronizer.dataSources.length > 0) {
                    if (playbackState == PlaybackState.PLAY || playbackState == PlaybackState.PAUSE) {

                        // Get the current time as reported by the synchronizer
                        await dataSynchronizer.getCurrentTime().then(
                            (value: any) => {

                                // If the reported value is valid
                                if (value['data'] != -1) {

                                    // Update the start time by converting from epoch time to formatted string
                                    startTime = TimePeriod.getFormattedTime(value['data']);
                                }
                            },
                            (reason: any) => {
                                console.error(JSON.stringify(reason));
                            },
                        )
                    }

                    // Build a list of promises
                    let promises = [];

                    // For each data source in the observable add it to the synchronizer
                    for (let dataSource of observable.dataSources) {

                        promises.push(dataSynchronizer.addDataSource(dataSource));
                    }

                    // Wait for all data sources to be added
                    await Promise.all(promises).then(
                        async () => {

                            // Update the time range, which will update all data sources to same time
                            await dataSynchronizer.setTimeRange(startTime, endTime,
                                dataSynchronizer.getReplaySpeed(), playbackState == PlaybackState.PLAY);
                        },
                        (reason) => {
                            console.error(reason)
                        });
                }

                addDataSources(state.dataSynchronizer, observable,
                    startTime, state.masterTime.playbackTimePeriod.endPosition, state.playbackState).then();
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

                let startTime = state.masterTime.playbackTimePeriod.beginPosition;

                let removeDataSources = async function (
                    dataSynchronizer: DataSynchronizer, observable: IObservable,
                    startTime: string, endTime: string, playbackState: PlaybackState) {

                    // DataSynchronizer reports 'true' on isConnected if there are no dataSources
                    // if (dataSynchronizer.dataSources.length > 0) {
                    if (playbackState == PlaybackState.PLAY || playbackState == PlaybackState.PAUSE) {

                        // Get the current time as reported by the synchronizer
                        await dataSynchronizer.getCurrentTime().then(
                            (value: any) => {

                                // If the reported value is valid
                                if (value['data'] != -1) {

                                    // Update the start time by converting from epoch time to formatted string
                                    startTime = TimePeriod.getFormattedTime(value['data']);
                                }
                            },
                            (reason: any) => {
                                console.error(JSON.stringify(reason));
                            },
                        )
                    }

                    await dataSynchronizer.disconnect();

                    for (let dataSource of observable.dataSources) {

                        dataSynchronizer.dataSources =
                            dataSynchronizer.dataSources.filter(
                                (ds: { getId: () => string; }) => ds.getId() !== dataSource.getId())

                        await dataSource.setTimeRange(REALTIME_START, REALTIME_FUTURE_END, 1, false);
                    }

                    if (dataSynchronizer.dataSources.length > 0) {

                        // Update the time range, which will update all data sources to same time
                        await dataSynchronizer.setTimeRange(startTime, endTime,
                            dataSynchronizer.getReplaySpeed(), playbackState == PlaybackState.PLAY);
                    }
                }

                removeDataSources(state.dataSynchronizer, observable,
                    startTime, state.masterTime.playbackTimePeriod.endPosition, state.playbackState).then();
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

            let updateSpeed = async function (dataSynchronizer: DataSynchronizer, timePeriod: ITimePeriod, speed: number) {

                await dataSynchronizer.setTimeRange(timePeriod.beginPosition, timePeriod.endPosition, speed, false);
            }

            updateSpeed(state.dataSynchronizer, state.masterTime.playbackTimePeriod, state.dataSynchronizerReplaySpeed).then();
        }),

        startPlayback: ((state, action: PayloadAction<void>) => {

            state.playbackState = PlaybackState.PLAY;
            state.dataSynchronizer.connect();
        }),

        pausePlayback: ((state) => {

            state.playbackState = PlaybackState.PAUSE;

            let pause = async function (dataSynchronizer: DataSynchronizer, timePeriod: ITimePeriod) {

                let startTime: string = null;

                await dataSynchronizer.getCurrentTime().then(
                    (value: any) => {

                        // If the reported value is valid
                        if (value['data'] != -1) {

                            // Update the start time by converting from epoch time to formatted string
                            startTime = TimePeriod.getFormattedTime(value['data']);
                        }
                    },
                    (reason: any) => {
                        console.error(JSON.stringify(reason));
                    },
                )

                await dataSynchronizer.disconnect();

                if (startTime != null) {

                    await dataSynchronizer.setTimeRange(startTime, timePeriod.endPosition,
                        dataSynchronizer.getReplaySpeed(), false);
                }
            }

            pause(state.dataSynchronizer, state.masterTime.playbackTimePeriod).then();
        }),
    },
})

export const {

    setAppInitialized,

    setUseBuildingModels,
    setShowTrails,

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
export const selectShowTrails = (state: RootState) => state.appState.settings.showTrails

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