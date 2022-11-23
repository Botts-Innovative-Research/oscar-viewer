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
    IPhysicalSystem,
    ISensorHubServer,
    ISettings,
    IObservable,
    MasterTime,
    Settings
} from "../data/Models";
import {RootState} from "./Store";

enableMapSet();

interface IAppState {

    initialized: boolean,

    settings: ISettings,
    contextMenuState: IContextMenu,

    settingsDialogOpen: boolean,
    serverManagementDialogOpen: boolean,
    addServerDialogOpen: boolean,
    observablesDialogOpen: boolean,
    timeControllerDialogOpen: boolean,
    systemsDialogOpen: boolean,

    masterTime: IMasterTime,
    sensorHubServers: ISensorHubServer[],
    physicalSystems: IPhysicalSystem[],
    observables: Map<string, IObservable>,
}

const initialState: IAppState = {

    initialized: false,

    settings: new Settings(),
    contextMenuState: new ContextMenuState(),

    settingsDialogOpen: false,
    serverManagementDialogOpen: false,
    addServerDialogOpen: false,
    observablesDialogOpen: false,
    timeControllerDialogOpen: false,
    systemsDialogOpen: false,

    masterTime: new MasterTime(),
    sensorHubServers: [],
    physicalSystems: [],
    observables: new Map<string, IObservable>(),
};

export const Slice = createSlice({
    name: 'AppStateSlice',
    initialState,
    reducers: {

        setAppInitialized: ((state, action: PayloadAction<boolean>) => {

            state.initialized = action.payload;
        }),

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

        setTimeControllerDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.timeControllerDialogOpen = action.payload;
        }),

        setSystemsDialogOpen: ((state, action: PayloadAction<boolean>) => {

            state.systemsDialogOpen = action.payload;
        }),

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

        addObservable: ((state, action: PayloadAction<IObservable>) => {

            state.observables.set(action.payload.uuid, action.payload);

            state.masterTime.updateMasterTime(action.payload.physicalSystem.physicalSystemTime.timePeriod);
        }),

        removeObservable: ((state, action: PayloadAction<IObservable>) => {

            if (action.payload.isConnected) {

                action.payload.disconnect();

                action.payload.isConnected = false;
            }

            state.observables.delete(action.payload.uuid);
        }),
    },
})

export const {

    setAppInitialized,

    setSettingsDialogOpen,
    setServerManagementDialogOpen,
    setAddServerDialogOpen,
    setObservablesDialogOpen,
    setSystemsDialogOpen,
    setTimeControllerDialogOpen,

    setUseBuildingModels,
    setShowTrails,

    updateContextMenuState,

    addSensorHubServer,
    removeSensorHubServer,
    addPhysicalSystem,
    removePhysicalSystem,
    addObservable,
    removeObservable

} = Slice.actions;

export const selectAppInitialized = (state: RootState) => state.appState.initialized

export const selectSettingsDialogOpen = (state: RootState) => state.appState.settingsDialogOpen
export const selectServerManagementDialogOpen = (state: RootState) => state.appState.serverManagementDialogOpen
export const selectAddServerDialogOpen = (state: RootState) => state.appState.addServerDialogOpen
export const selectObservablesDialogOpen = (state: RootState) => state.appState.observablesDialogOpen
export const selectTimeControllerDialogOpen = (state: RootState) => state.appState.timeControllerDialogOpen
export const selectSystemsDialogOpen = (state: RootState) => state.appState.systemsDialogOpen

export const selectContextMenuState = (state: RootState) => state.appState.contextMenuState

export const selectUseBuildingModels = (state: RootState) => state.appState.settings.useBuildingModels
export const selectShowTrails = (state: RootState) => state.appState.settings.showTrails


export const selectServers = (state: RootState) => state.appState.sensorHubServers
export const selectPhysicalSystems = (state: RootState) => state.appState.physicalSystems
export const selectObservables = (state: RootState) => state.appState.observables
export const selectMasterTime = (state: RootState) => state.appState.masterTime


export default Slice.reducer;