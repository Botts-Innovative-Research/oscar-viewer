/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSelector, createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
// @ts-ignore
import {RootState} from "../Store";
// @ts-ignore
import {INode} from "@/app/data/osh/Node";
import {ISystem} from "../data/osh/Systems";
// @ts-ignore
import {IDatastream} from "@/app/data/osh/Datastreams";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource.js";
// @ts-ignore
import {Mode} from "osh-js/source/core/datasource/Mode";
import {ITimeSynchronizerProps, TimeSynchronizerProps} from "@/lib/data/osh/TimeSynchronizers";
import {Node, NodeOptions} from "@/lib/data/osh/Node";

enableMapSet();

export interface IOSHSlice {
    // nodes: Map<number,INode>,
    nodes: INode[],
    // currentNodeId: string,
    configNode: INode,
    systems: ISystem[],
    // dataStreams: IDatastream[],
    dataStreams: Map<string, IDatastream>,
    mainDataSynchronizer: ITimeSynchronizerProps,
    datasources: typeof SweApi[],
    otherDataSynchronizers: ITimeSynchronizerProps[],
    datasourcesToDatastreams: Map<string, string>
}

const initialNodeOpts: NodeOptions = {
    name: "Windows Test Node",
    // address: "127.0.0.1",
    // address: "162.238.96.81",
    address: "192.168.1.158",
    port: 8781,
    // port: 8282,
    oshPathRoot: "/sensorhub",
    sosEndpoint: "/sos",
    csAPIEndpoint: "/api",
    csAPIConfigEndpoint: "/configs",
    auth: {username: "admin", password: "admin"},
    isSecure: false,
    isDefaultNode: true
}

const initialNode = new Node(initialNodeOpts);

const initialState: IOSHSlice = {
    nodes: [new Node(initialNodeOpts)],
    configNode: null,
    systems: [],
    dataStreams: new Map<string, IDatastream>(),
    mainDataSynchronizer: new TimeSynchronizerProps(new Date().toISOString(),
        "...", 1, 5, [], Mode.REAL_TIME),
    datasources: [],
    otherDataSynchronizers: [],
    datasourcesToDatastreams: new Map<string, string>()
}

export const Slice = createSlice({
    name: 'OSHSlice',
    initialState,
    reducers: {
        addNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.name === action.payload.name);
            console.log("Adding node: ", nodeIndex);
            if (nodeIndex === -1) {
                state.nodes.push(action.payload);
            } else{
                console.error("Node with same name already exists in the OSHSlice");
            }
        },
        addSystem: (state, action: PayloadAction<ISystem>) => {
            state.systems.push(action.payload);
        },
        addDatastream: (state, action: PayloadAction<IDatastream>) => {
            state.dataStreams.set(action.payload.id, action.payload);
        },
        addDatasource: (state, action: PayloadAction<typeof SweApi>) => {
            state.datasources.push(action.payload);
        },
        addDatasourceToDatastreamEntry: (state, action: PayloadAction<{
            datastreamId: string,
            datasourceName: string
        }>) => {
            console.info("Adding datasource to datastream", action.payload);
            state.datasourcesToDatastreams.set(action.payload.datasourceName, action.payload.datastreamId);
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
        setDatasources: (state, action: PayloadAction<typeof SweApi[]>) => {
            state.datasources = action.payload;
        },
        setNodes: (state, action: PayloadAction<INode[]>) => {
            state.nodes = action.payload
        },
        updateNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.name === action.payload.name);
            state.nodes[nodeIndex] = action.payload as Node;
        },
        removeNode: (state, action: PayloadAction<string>) => {
            const rmvNode = state.nodes.find((node: INode) => node.id === action.payload);
            if (rmvNode.isDefaultNode) {
                console.error("Cannot remove the default node");
                return;
            }
            const nodeIndex = state.nodes.findIndex((node: INode) => node.id === action.payload);
            state.nodes.splice(nodeIndex, 1);
        },
        changeConfigNode: (state, action: PayloadAction<INode>) => {
            state.configNode = action.payload;
        },
        createDatasourceOfDatastream: (state, action: PayloadAction<{ datastreamId: string }>) => {
            const datastream = state.dataStreams.get(action.payload.datastreamId);
            const datasource = datastream.generateSweApiObj({start: 'now', end: 'latest'});
            if (!state.datasources.some(ds => ds.name === datasource.name)) {
                state.datasources.push(datasource);
                state.datasourcesToDatastreams.set(datasource.name, datastream.id);
            }
        },
        removeDatasource: (state, action: PayloadAction<string>) => {
            const rmvDs = state.datasources.find((ds: typeof SweApi) => ds.name === action.payload);
            const dsIndex = state.datasources.findIndex((ds: typeof SweApi) => ds.name === action.payload);
            state.datasources.splice(dsIndex, 1);
            state.datasourcesToDatastreams.delete(rmvDs.name);
        }
    },
})


export const {
    addNode,
    addSystem,
    addDatastream,
    addDatasource,
    addDatasourceToDatastreamEntry,
    addDataSynchronizer,
    setMainDataSynchronizer,
    setSystems,
    setDatastreams,
    setDatasources,
    setNodes,
    updateNode,
    removeNode,
    changeConfigNode,
    createDatasourceOfDatastream,
    removeDatasource
} = Slice.actions;

export const selectNodes = (state: RootState) => state.oshSlice.nodes;
export const selectCurrentNodeId = (state: RootState) => state.oshSlice.currentNodeId;
export const getNodeById = (state: RootState, id: number) => {
    const foundNode = state.oshSlice.nodes.find((node: any) => node.id === id);
    return foundNode;
}
export const selectSystems = (state: RootState) => state.oshSlice.systems;
export const selectDatastreams = (state: RootState) => state.oshSlice.dataStreams;
export const selectDatastreamById = (datastreamId: string) => (state: RootState) => {
    return state.oshSlice.dataStreams.get(datastreamId);
}
export const selectDefaultNode = (state: RootState) => state.oshSlice.nodes.find((node: INode) => node.isDefaultNode);
export const selectDatasources = (state: RootState) => state.oshSlice.datasources;
export const selectMainDataSynchronizer = (state: RootState) => state.oshSlice.mainDataSynchronizer;
export const selectDatasynchronizers = (state: RootState) => state.oshSlice.otherDataSynchronizers;


export default Slice.reducer;
