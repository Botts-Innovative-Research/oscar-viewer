/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// @ts-ignore
import {INode} from "@/app/data/osh/Node";
import {randomUUID} from "osh-js/source/core/utils/Utils";

export interface ISystem {
    id: string,
    uid: string,
    name: string,
    parentNode: INode,
    parentSystemId: string | null,
    fetchDataStreams(): Promise<any>,
    fetchSubsystems(): Promise<any>
}

export class System implements ISystem {
    id: string;
    uid: string;
    name: string;
    parentNode: INode;
    parentSystemId: string | null;

    constructor(id: string, uid: string, name: string, parentNode: INode, parentSystemId: string | null) {
        // this.id = "system" + randomUUID();
        this.id = id;
        this.uid = uid;
        this.name = name;
        this.parentNode = parentNode;
        this.parentSystemId = parentSystemId;
    }

    async fetchDataStreams() {
        console.log(`fetching data streams for system: ${this.id}`);
        // fetch data streams from the server with CSAPI
        const response = await fetch(`${this.parentNode.getConnectedSystemsEndpoint()}/systems/${this.id}/datastreams`);

        if (response.ok) {
            const data = await response.json();
            return data.items;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.parentNode.getConnectedSystemsEndpoint()}`);
        }
    }

    async fetchSubsystems() {
        // fetch subsystems from the server with CSAPI
        const response = await fetch(`${this.parentNode.getConnectedSystemsEndpoint()}/systems/${this.id}/subsystems`);
        if (response.ok) {
            const data = await response.json();
            let subsystems: ISystem[] = [];
            for (let subsystem of data.items) {
                const newSystem = new System(subsystem.id, subsystem.properties.uid, subsystem.properties.name, this.parentNode, this.id);
                subsystems.push(newSystem);
            }

            return subsystems;
        } else {
            throw new Error(`Failed to fetch systems from node @: ${this.parentNode.getConnectedSystemsEndpoint()}`);
        }
    }
}