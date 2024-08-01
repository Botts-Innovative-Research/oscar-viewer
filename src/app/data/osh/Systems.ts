/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {INode} from "@/app/data/osh/Node";

export interface ISystem {
    id: string,
    uid: string,
    name: string,
    parentNode: INode,
    parentSystemId: string | null,
}

export class System implements ISystem {
    id: string;
    uid: string;
    name: string;
    parentNode: INode;
    parentSystemId: string | null;

    constructor(id: string, uid: string, name: string, parentNode: INode, parentSystemId: string | null) {
        this.id = id;
        this.uid = uid;
        this.name = name;
        this.parentNode = parentNode;
        this.parentSystemId = parentSystemId;
    }

    async fetchDataStreams() {
        // fetch data streams from the server with CSAPI
        const response = await fetch(`${this.parentNode.getConnectedSystemsEndpoint()}/systems${this.id}/datastreams`);
        if (response.ok) {
            const data = response.json();
            return data;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.parentNode.getConnectedSystemsEndpoint()}`);
        }
    }
}
