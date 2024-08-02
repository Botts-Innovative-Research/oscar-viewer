/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
// @ts-ignore
import {RootState} from "../Store";
// @ts-ignore
import {INode} from "@/app/data/osh/Node";
import {ISystem} from "../data/osh/Systems";
// @ts-ignore
import {IDatastream} from "@/app/data/osh/Datastreams";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";

enableMapSet();

interface IOSHSlice {
    nodes: INode[],
    systems: ISystem[],
    dataStreams: IDatastream[],
    mainDataSynchronizer: DataSynchronizer,
    datasources: SweApi[],
    otherDataSynchronizers: DataSynchronizer[]
}

const initialState: IOSHSlice = {
    nodes: [],
    systems: [],
    dataStreams: [],
    mainDataSynchronizer: new DataSynchronizer({
        startTime: new Date().toISOString(),
        endTime: "...",
        replaySpeed: 1,
        intervalRate: 5,
        dataSources: [],
        mode: Mode.REPLAY
    }),
    datasources: [],
    otherDataSynchronizers: []
}

export const Slice = createSlice({
    name: 'OSHSlice',
    initialState,
    reducers: {
        addNode: (state, action: PayloadAction<INode>) => {
            state.nodes.push(action.payload);
        },
        addSystem: (state, action: PayloadAction<ISystem>) => {
            state.systems.push(action.payload);
        },
        addDatastream: (state, action: PayloadAction<IDatastream>) => {
            state.dataStreams.push(action.payload);
        },
        addDatasource: (state, action: PayloadAction<SweApi>) => {
            state.datasources.push(action.payload);
        },
        addDataSynchronizer: (state, action: PayloadAction<DataSynchronizer>) => {
            state.otherDataSynchronizers.push(action.payload);
        },
        setMainDataSynchronizer: (state, action: PayloadAction<DataSynchronizer>) => {
            state.mainDataSynchronizer = action.payload;
        },
    }
})


export const {
    addNode,
    addSystem,
    addDatastream,
    addDatasource,
    addDataSynchronizer,
    setMainDataSynchronizer
} = Slice.actions;

export const getNodes = (state: RootState) => state.OSHSlice.nodes;
export const getSystems = (state: RootState) => state.OSHSlice.systems;
export const getDatastreams = (state: RootState) => state.OSHSlice.dataStreams;
export const getDatasources = (state: RootState) => state.OSHSlice.datasources;
export const getMainDataSynchronizer = (state: RootState) => state.OSHSlice.mainDataSynchronizer;
export const getDatasynchronizers = (state: RootState) => state.OSHSlice.otherDataSynchronizers;

export default Slice.reducer;
