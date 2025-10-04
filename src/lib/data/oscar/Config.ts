/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


import {INode, Node} from "@/lib/data/osh/Node";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter";


const CONFIG_UID = "urn:ornl:oscar:client:config";

export interface IConfigData{
    time: string,
    id: string,
    user: string,
    nodes: INode[],
    numNodes: number
}

export default class ConfigData implements IConfigData {
    time: string;
    id: string;
    user: string;
    nodes: INode[];
    numNodes: number

    constructor(time: string, id: string, user: string, nodes: INode[], numNodes: number) {
        this.time = time;
        this.id = id;
        this.user = user;
        this.nodes = nodes;
        this.numNodes = numNodes
    }

    setTime(time: string) {
        this.time = time;
    }

    setId(id: string) {
        this.id = id;
    }

    setUser(user: string) {
        this.user = user;
    }

    setNode(nodes: INode[]) {
        this.nodes = nodes;
    }

    getTime() {
        return this.time;
    }

    getId() {
        return this.id;
    }

    getUser() {
        return this.user;
    }

    getNode() {
        return this.nodes;
    }

    createConfigurationObservation() {
        let observation = {
            "phenomenonTime": this.time,
            "result": {
                "user": this.user,
                "numNodes": this.numNodes,
                "nodes": this.nodes.map((node: any) => ({
                    "name": node.name,
                    "address": node.address,
                    "port": typeof node.port === "string" ? node.port : node.port?.toString(),
                    "oshPathRoot": node.oshPathRoot,
                    "csAPIEndpoint": node.csAPIEndpoint,
                    "isSecure": node.isSecure,
                    "isDefaultNode": node.isDefaultNode,
                    "username": node?.auth?.username ? node.auth.username : node.username,
                    "password": node?.auth?.password ? node.auth.password : node.password
                }))
            }
        }

        return JSON.stringify(observation, null, 2);

    }

    retrieveLatestConfig(node: INode){}
}


export function createConfigObservation(data: IConfigData, resultTime: string){

    let observation = {
        "phenomenonTime": new Date(resultTime).getTime(),
        "result":{
            "user": data.user,
            "numNodes": data.numNodes,
            "nodes": data.nodes
        }
    }

    // return observation
    return JSON.stringify(observation, null, 2);

}

//checks if config system exists and if it doesnt it creates it and inserts its datastream
export async function getConfigSystemID(node: INode): Promise<string> {

    let systems = await node.fetchSystems();

    let configSystem = systems?.find((system: any) => system.properties?.properties.uid === CONFIG_UID);

    if(configSystem){
        return configSystem.properties.properties.id;
    }
}

const startTime = new Date();

export async function getConfigDataStreamID(node: INode): Promise<string>{
    if(!node) return null;

    const systems = await node.fetchSystems();

    const configSystem = systems.find((system: any) => system.properties.properties.uid == CONFIG_UID);


    if(configSystem){
        let dsCollection = await configSystem.searchDataStreams(new DataStreamFilter({resultTime: 'latest'}), 1);

        let datastream = await dsCollection.nextPage();

        return datastream.properties.id;
    }
}

export async function retrieveLatestConfigDataStream(node: any) {

    let localNode = await node.checkForEndpoint();

    if (localNode) {
        const systems = await node.fetchSystems();

        const configSystem = systems?.find((system: any) => system.properties.properties.uid == CONFIG_UID);

        if(configSystem) {
            const dsCollection = await configSystem.searchDataStreams(new DataStreamFilter({resultTime: 'latest'}), 1);

            let ds = await dsCollection.nextPage();

            return ds;
        }

    }
}

