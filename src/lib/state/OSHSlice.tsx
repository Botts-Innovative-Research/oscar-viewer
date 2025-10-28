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
import {Node} from "@/lib/data/osh/Node";



enableMapSet();

export interface IOSHSlice {
    nodes: INode[],
    configNode: INode,
}


function loadNodesFromLocalStorage(): INode[] {
    try {
        const stored = localStorage.getItem("osh_nodes");
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        return parsed.map((n: any) => rehydrateNode(n));
    } catch(e) {
        console.error("Failed to load nodes from local storage", e);
        return [];
    }
}

function loadConfigNodeFromStorage(): INode | null {
    try {
        const stored = localStorage.getItem("osh_config_node");
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        return rehydrateNode(parsed);
    } catch(e) {
        console.error("Failed to load config node from local storage", e);
        return null;
    }
}


const initialState: IOSHSlice = {
    nodes: loadNodesFromLocalStorage(),
    configNode: loadConfigNodeFromStorage()
}

function rehydrateNode(obj: any): Node {
    return new Node({
        ...obj
    });
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
                localStorage.setItem("osh_nodes", JSON.stringify(state.nodes));
            } else {
                console.error("Node with same name already exists in the OSHSlice");
            }
        },
        setNodes: (state, action: PayloadAction<INode[]>) => {
            state.nodes = action.payload
            localStorage.setItem("osh_nodes", JSON.stringify(state.nodes));

        },
        updateNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.name === action.payload.name);

            if (nodeIndex !== -1) {
                state.nodes[nodeIndex] = action.payload as Node;
                localStorage.setItem("osh_nodes", JSON.stringify(state.nodes));
            }
        },
        removeNode: (state, action: PayloadAction<string>) => {
            const rmvNode = state.nodes.find((node: INode) => node.id === action.payload);

            if(!rmvNode){
                console.error("Cannot find node to remove");
                return;
            };
            if (rmvNode.isDefaultNode) {
                console.error("Cannot remove the default node");
                return;
            }
            const nodeIndex = state.nodes.findIndex((node: INode) => node.id === action.payload);
            state.nodes.splice(nodeIndex, 1);
            localStorage.setItem("osh_nodes", JSON.stringify(state.nodes));
        },
        changeConfigNode: (state, action: PayloadAction<INode>) => {
            state.configNode = action.payload;
            localStorage.setItem("osh_config_node", JSON.stringify(state.configNode));

        },
    },
})


export const {
    addNode,
    setNodes,
    updateNode,
    removeNode,
    changeConfigNode,
} = Slice.actions;

export const selectNodes = (state: RootState) => state.oshSlice.nodes;
export const selectDefaultNode = (state: RootState) => state.oshSlice.nodes.find((node: INode) => node.isDefaultNode);

export default Slice.reducer;
