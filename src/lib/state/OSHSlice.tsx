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
import {Mode} from "osh-js/source/core/datasource/Mode";
import {ITimeSynchronizerProps, TimeSynchronizerProps} from "@/lib/data/osh/TimeSynchronizers";
import {Node} from "@/lib/data/osh/Node";
import {System} from "../data/osh/Systems";

enableMapSet();

export interface IOSHSlice {
    // nodes: Map<number,INode>,
    nodes: INode[],
    currentNodeId: number,
    systems: ISystem[],
    // dataStreams: IDatastream[],
    dataStreams: Map<string, IDatastream>,
    mainDataSynchronizer: ITimeSynchronizerProps,
    datasources: SweApi[],
    otherDataSynchronizers: ITimeSynchronizerProps[]
}

const initialState: IOSHSlice = {
    // nodes: new Map<number, INode>([[1,new Node(1, "Windows Test Node", "162.238.96.81", 8781)]]),
    nodes: [new Node(1, "Windows Test Node", "192.168.1.158", 8781)],
    currentNodeId: 2,
    systems: [],
    dataStreams: new Map<string, IDatastream>(),
    mainDataSynchronizer: new TimeSynchronizerProps(new Date().toISOString(),
        "...", 1, 5, [], Mode.REAL_TIME),
    datasources: [],
    otherDataSynchronizers: []
}

export const Slice = createSlice({
    name: 'OSHSlice',
    initialState,
    reducers: {
        addNode: (state, action: PayloadAction<INode>) => {
            // action.payload.id = state.currentNodeId;
            // incrementCurrentNodeId();
            // state.nodes.set(action.payload.id,action.payload);
            state.nodes.push(action.payload);
        },
        incrementCurrentNodeId: (state) => {
            state.currentNodeId++;
        },
        addSystem: (state, action: PayloadAction<ISystem>) => {
            state.systems.push(action.payload);
        },
        addDatastream: (state, action: PayloadAction<IDatastream>) => {
            state.dataStreams.set(action.payload.id, action.payload);
        },
        addDatasource: (state, action: PayloadAction<SweApi>) => {
            state.datasources.push(action.payload);
        },
        addDataSynchronizer: (state, action: PayloadAction<ITimeSynchronizerProps>) => {
            state.otherDataSynchronizers.push(action.payload);
        },
        setMainDataSynchronizer: (state, action: PayloadAction<ITimeSynchronizerProps>) => {
            state.mainDataSynchronizer = action.payload;
        },
        setSystems: (state, action: PayloadAction<ISystem[]>) => {
            console.warn("Setting systems in the OSHSlice");
            console.info(action.payload);
            state.systems = action.payload;
        },
        setDatastreams: (state, action: PayloadAction<Map<string, IDatastream>>) => {
            state.dataStreams = action.payload;
        },
        updateNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.id === action.payload.id);
            state.nodes[nodeIndex] = action.payload;
        },
        removeNode: (state, action: PayloadAction<number>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.id === action.payload);
            state.nodes.splice(nodeIndex, 1);
        }
    }
})


export const {
    addNode,
    incrementCurrentNodeId,
    addSystem,
    addDatastream,
    addDatasource,
    addDataSynchronizer,
    setMainDataSynchronizer,
    setSystems,
    setDatastreams,
    updateNode,
    removeNode
} = Slice.actions;

export const selectNodes = (state: RootState) => state.oshSlice.nodes;
export const selectCurrentNodeId = (state: RootState) => state.oshSlice.currentNodeId;
export const getNodeById = (state: RootState, id: number) => {
    const foundNode = state.oshSlice.nodes.find((node: any) => node.id === id);
    return foundNode;
}
export const selectSystems = (state: RootState) => state.oshSlice.systems;
export const selectDatastreams = (state: RootState) => state.oshSlice.dataStreams;
export const selectDatastreamsOfSystem = (systemId: string) => (state: RootState) => {
    const datastreamsOfSystem = [];
    for (let [id, ds] of state.oshSlice.dataStreams.entries()) {
        if (ds.parentSystemId === systemId) {
            datastreamsOfSystem.push(ds);
        }
    }
    return datastreamsOfSystem;
}
export const selectDatasources = (state: RootState) => state.oshSlice.datasources;
export const selectMainDataSynchronizer = (state: RootState) => state.oshSlice.mainDataSynchronizer;
export const selectDatasynchronizers = (state: RootState) => state.oshSlice.otherDataSynchronizers;

export default Slice.reducer;