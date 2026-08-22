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
    if (typeof window === "undefined") return [];

    try {
        const stored = localStorage.getItem("osh_nodes");
        if (!stored) return [];

        const parsed = JSON.parse(stored);

        const nodes = parsed.map((n: any) => rehydrateNode(n));
        // Rewrite legacy entries immediately so previously saved credentials are removed.
        persistNodes(nodes);
        return nodes;
    } catch(e) {
        console.error("Failed to load nodes from local storage", e);
        return [];
    }
}

function loadConfigNodeFromStorage(): INode | null {
    if (typeof window === "undefined") return [];

    try {
        const stored = localStorage.getItem("osh_config_node");
        if (!stored) return null;

        const parsed = JSON.parse(stored);

        const node = rehydrateNode(parsed);
        persistConfigNode(node);
        return node;
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
    if (!obj.port) {
        obj.port = obj.isSecure ? 443 : 80;
    }
    return new Node({
        ...obj,
        // Authentication secrets are intentionally never restored from browser storage.
        auth: {username: "", password: ""}
    });
}

function serializeNode(node: INode) {
    return {
        name: node.name,
        address: node.address,
        port: node.port,
        oshPathRoot: node.oshPathRoot,
        csAPIEndpoint: node.csAPIEndpoint,
        bucketsEndpoint: node.bucketsEndpoint,
        isSecure: node.isSecure,
        authenticationMode: node.authenticationMode,
        isDefaultNode: node.isDefaultNode,
        siteMapPath: node.siteMapPath,
        lowerLeftBound: node.lowerLeftBound,
        upperRightBound: node.upperRightBound,
    };
}

function persistNodes(nodes: INode[]) {
    localStorage.setItem("osh_nodes", JSON.stringify(nodes.map(serializeNode)));
}

function persistConfigNode(node: INode) {
    localStorage.setItem("osh_config_node", JSON.stringify(serializeNode(node)));
}
export const Slice = createSlice({
    name: 'OSHSlice',
    initialState,
    reducers: {
        addNode: (state, action: PayloadAction<INode>) => {
            state.nodes.push(action.payload);
            persistNodes(state.nodes);

        },
        setNodes: (state, action: PayloadAction<INode[]>) => {
            state.nodes = action.payload
            persistNodes(state.nodes);
        },
        updateNode: (state, action: PayloadAction<INode>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.name === action.payload.name);

            if (nodeIndex !== -1) {
                state.nodes[nodeIndex] = action.payload as Node;
                persistNodes(state.nodes);
            }
        },
        removeNode: (state, action: PayloadAction<string>) => {
            const nodeIndex = state.nodes.findIndex((node: INode) => node.id === action.payload);
            state.nodes.splice(nodeIndex, 1);
            persistNodes(state.nodes);
        },
        changeConfigNode: (state, action: PayloadAction<INode>) => {
            state.configNode = action.payload;
            persistConfigNode(state.configNode);

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
