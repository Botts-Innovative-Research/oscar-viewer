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

    setNode(nodes: Node[]) {
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
        console.log("Creating configuration observation: ", this);

        let observation = {
            "phenomenonTime": this.time,
            "result": {
                "user": this.user,
                "numNodes": this.numNodes,
                "nodes": this.nodes.map((node: any) => ({
                    "name": node.name,
                    "address": node.address,
                    "port": node.port,
                    "oshPathRoot": node.oshPathRoot,
                    "sosEndpoint": node.sosEndpoint,
                    "csAPIEndpoint": node.csAPIEndpoint,
                    "configsEndpoint": node.configsEndpoint,
                    "isSecure": node.isSecure,
                    "isDefaultNode": node.isDefaultNode,
                    "username": node.auth.username,
                    "password": node.auth.password
                }))
            }
        }

        return JSON.stringify(observation, null, 2);

    }

    retrieveLatestConfig(node: INode){}
}


export function createConfigObservation(data: IConfigData, resultTime: string){
    console.log("Creating configuration observation: ", data);

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

export async function getConfigSystemID(node: INode): Promise<string> {
    let systems = await node.fetchSystems();
    console.log("Systems retrieved:", systems);

    let configSystem = systems.find((system: any) => system.properties?.properties.uid === CONFIG_UID);

    console.log("configSys", configSystem)

    if (!configSystem) {
        console.log("No config system found, attempting to create one...");

        let ep: string = `${node.getConfigEndpoint(false)}/systems/`;

        let configSystemId = await node.insertSystem(configSystemJSON, ep)

        if(configSystemId){

            const endpoint = `${ep}${configSystemId}/datastreams/`
            await node.insertDatastream(endpoint, configDatastreamConstant);

        }

        console.log("Config system found: ", configSystemId);
        return configSystemId;
    }else{
        return configSystem.properties.id;
    }
}

const startTime = new Date();

export async function getConfigDataStreamID(node: INode): Promise<string>{
    if(!node) return null;

    const systems = await node.fetchSystems();

    const configSystem = systems.find((system: any) => system.properties.properties.uid == CONFIG_UID);

    if(configSystem){
        let dsCollection = await configSystem.searchDataStreams(new DataStreamFilter(), 1000);

        if(dsCollection.hasNext()){
            let datastreams = await dsCollection.nextPage();

            if(datastreams.length > 0){
                return datastreams[0].properties.id;
            }else{
                return null;
            }
        }

    }
}

export async function retrieveLatestConfigDataStream(node: INode) {
    let apiFound = await node.checkForEndpoint();

    if (apiFound) {
        const systems = await node.fetchSystems();

        const configSystem = systems.find((system: any) => system.properties.properties.uid == "urn:ornl:oscar:client:config");

        if(configSystem){
            const dsCollection = await configSystem.searchDataStreams(new DataStreamFilter(), 1);

            if(dsCollection.hasNext()) {
                let ds = await dsCollection.nextPage();

                return ds[0];
            }
        }

    }
}

export const configSystemJSON = {
    "type": "PhysicalSystem",
    "uniqueId": "urn:ornl:oscar:client:config",
    "definition": "http://www.w3.org/ns/sosa/Sensor",
    "label": "OSCAR Client Config",
    "validTime": [
        (new Date(startTime).toISOString()),
        "now"
    ]
}

export const configDatastreamConstant: any = {
        "name": "Config",
        "outputName": "Config",
        "schema": {
            "obsFormat": "application/om+json",
            "resultSchema": {
                "type": "DataRecord",
                "definition": "http://sensorml.com/ont/swe/property/oscarConfig",
                "description": "Configurations saved via OSCAR Client",
                "fields": [
                    {
                        "type": "Time",
                        "label": "Sampling Time",
                        "name": "time",
                        "definition": "http://www.opengis.net/def/property/OGC/0/SamplingTime",
                        "referenceFrame": "http://www.opengis.net/def/trs/BIPM/0/UTC",
                        "uom": {
                            "href": "http://www.opengis.net/d…uom/ISO-8601/0/Gregorian"
                        }
                    },
                    {
                        "type": "Text",
                        "name": "user",
                        "definition": "http://sensorml.com/ont/swe/property/User",
                        "label": "User"
                    },
                    {
                        "type": "Count",
                        "name": "numNodes",
                        "label": "Number of Nodes",
                        "id": "numNodes"
                    },
                    {
                        "type": "DataArray",
                        "label": "Nodes",
                        "definition": "http://www.test.org/def/nodes",
                        "name": "nodes",
                        "elementCount": {
                            "href": "#numNodes"
                        },
                        "elementType": {
                            "type": "DataRecord",
                            "fields": [
                                {
                                    "type": "Text",
                                    "name": "name",
                                    "definition": "http://sensorml.com/ont/swe/property/Name",
                                    "label": "Name"
                                },
                                {
                                    "type": "Text",
                                    "name": "address",
                                    "definition": "http://sensorml.com/ont/swe/property/Address",
                                    "label": "Address"
                                },
                                {
                                    "type": "Text",
                                    "name": "port",
                                    "definition": "http://sensorml.com/ont/swe/property/Port",
                                    "label": "Port"
                                },
                                {
                                    "type": "Text",
                                    "name": "oshPathRoot",
                                    "definition": "http://sensorml.com/ont/swe/property/oshPathRoot",
                                    "label": "OSH Path Root"
                                },
                                {
                                    "type": "Text",
                                    "name": "sosEndpoint",
                                    "definition": "http://sensorml.com/ont/swe/property/sosEndpoint",
                                    "label": "SOS Endpoint"
                                },
                                {
                                    "type": "Text",
                                    "name": "csAPIEndpoint",
                                    "definition": "http://sensorml.com/ont/swe/property/csAPIEndpoint",
                                    "label": "ConSys API Endpoint"
                                },
                                {
                                    "type": "Text",
                                    "name": "configsEndpoint",
                                    "definition": "http://sensorml.com/ont/swe/property/configsEndpoint",
                                    "label": "Config Endpoint"
                                },
                                {
                                    "type": "Boolean",
                                    "name": "isSecure",
                                    "definition": "http://sensorml.com/ont/swe/property/isSecure",
                                    "label": "Secure"
                                },
                                {
                                    "type": "Boolean",
                                    "name": "isDefaultNode",
                                    "definition": "http://sensorml.com/ont/swe/property/isDefaultNode",
                                    "label": "Default Node"
                                },
                                {
                                    "type": "Text",
                                    "name": "username",
                                    "definition": "http://sensorml.com/ont/swe/property/username",
                                    "label": "Username"
                                },
                                {
                                    "type": "Text",
                                    "name": "password",
                                    "definition": "http://sensorml.com/ont/swe/property/password",
                                    "label": "Password"
                                }
                            ]
                        }
                    }
                ]
            }
        }
    }


