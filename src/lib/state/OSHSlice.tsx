/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */
'use client';


import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
// @ts-ignore
import {RootState} from "../Store";
// @ts-ignore
import {INode} from "@/app/data/osh/Node";
import {Node, NodeOptions} from "@/lib/data/osh/Node";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream.js";
import {useEffect} from "react";


enableMapSet();

export interface IOSHSlice {
    nodes: INode[],
    configNode: INode,
    datastreams: typeof DataStream[]
}


const initialState: IOSHSlice = {
    nodes: [],
    configNode: null,
    datastreams: []
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
            } else {
                console.error("Node with same name already exists in the OSHSlice");
            }
        },
        setNodes: (state, action: PayloadAction<INode[]>) => {

            state.nodes = action.payload
        },
        setDatastreams: (state, action: PayloadAction<typeof DataStream[]>) => {
            state.datastreams = action.payload
        },
        updateNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.name === action.payload.name);
            state.nodes[nodeIndex] = action.payload as Node;
        },
        removeNode: (state, action: PayloadAction<string>) => {
            const rmvNode = state.nodes.find((node: INode) => node.id === action.payload);

            if(!rmvNode){
                console.error("Cannot find node to remove");
                return;
            }
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
    },
})


export const {
    addNode,
    setNodes,
    updateNode,
    removeNode,
    changeConfigNode,
    setDatastreams
} = Slice.actions;

export const selectNodes = (state: RootState) => state.oshSlice.nodes;
export const selectDataStreams = (state: RootState) => state.oshSlice.dataStreams;
export const selectDefaultNode = (state: RootState) => state.oshSlice.nodes.find((node: INode) => node.isDefaultNode);

export default Slice.reducer;
