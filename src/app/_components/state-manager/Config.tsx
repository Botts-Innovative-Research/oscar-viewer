import { insertSystem, insertDatastream } from "@/lib/data/Constants";
import {INode, Node} from "@/lib/data/osh/Node";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter";


const CONFIG_UID = "urn:ornl:oscar:client:config";

export interface IConfigData{
    time: string,
    id: string,
    user: string,
    nodes: INode[],
    nodeCount: number
}

export default class ConfigData implements IConfigData {
    time: string;
    id: string;
    user: string;
    nodes: INode[];
    nodeCount: number

    constructor(time: string, id: string, user: string, nodes: INode[], nodeCount: number) {
        this.time = time;
        this.id = id;
        this.user = user;
        this.nodes = nodes;
        this.nodeCount = nodeCount
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
        console.log("Creating configuarion observation: ", this);

        let observation = {
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
                                "href": "http://www.opengis.net/def/uom/ISO-8601/0/Gregorian"
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
                            "name": "nodeCount",
                            "label": "Node Count",
                            "id": "nodeCount"
                        },
                        {
                            "type": "DataArray",
                            "label": "Nodes",
                            "definition": "http://www.test.org/def/nodes",
                            "name": "Nodes",
                            "elementCount": {
                                "href": "#nodeCount"
                            },
                            "elementType": {
                                "type": "DataRecord",
                                "name": "nodes",
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
                                        "label": "sos Endpoint"
                                    },
                                    {
                                        "type": "Text",
                                        "name": "csAPIEndpoint",
                                        "definition": "http://sensorml.com/ont/swe/property/csAPIEndpoint",
                                        "label": "cs API Endpoint"
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
            },

            "phenomenonTime": this.time,
            "result": {
                "user": this.user,
                "nodeCount": this.nodeCount,
                "Nodes": this.nodes.map((node: any) => ({
                    "name": node.name,
                    "address": node.address,
                    "port": node.port,
                    "oshPathRoot": node.oshPathRoot,
                    "sosEndpoint": node.sosEndpoint,
                    "csAPIEndpoint": node.csAPIEndpoint,
                    "isSecure": node.isSecure,
                    "isDefaultNode": node.isDefaultNode,
                    "username": node.auth.username,
                    "password": node.auth.password
                }))
            }
        }

        return JSON.stringify(observation, null, 2);

    }


    insertConfigSystem(node: INode, systemId: string){}

    insertConfigDatastream(node: INode, systemId: string){}

    retrieveLatestConfig(node: INode){}
}


export class ConfigCommand{
    setConfig: boolean;
    observationId: string;

    constructor(obsId: string, setConfig: true) {
        this.observationId = obsId;
        this.setConfig = setConfig;
    }

    getJsonString() {
        return JSON.stringify(
            {
                "params": {
                    'observationId': this.observationId,
                    'setConfig': this.setConfig
                }
            })
    }
}

export function createConfigObservation(data: IConfigData, resultTime: string){
    console.log("Creating configuarion observation: ", data);

    let observation = {
        "phenomenonTime": new Date(resultTime).getTime(),
        "result":{
            "user": data.user,
            "node": data.nodes
        }
    }

    // return observation
    return JSON.stringify(observation, null, 2);

}

export async function sendConfig(endpoint: string, observation: any){
    let resp = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: observation,
        mode: "cors"
    });

    return resp;
}

export async function checkForConfigSystem(node: INode): Promise<string> {
    let systems = await node.fetchSystems();
    console.log("TK Systems retrieved:", systems);

    let configSystem = systems.find((system: any) => system.properties?.properties.uid === CONFIG_UID);

    console.log("configSys", configSystem)
    if (!configSystem) {
        console.log("No config system found, attempting to create one...");
        let configSystemId = await insertConfigSystem(node);

        console.log("Config system found: ", configSystemId);
        return configSystemId;
    }else{
        return configSystem.properties.id;
    }
}


export async function sendSetAdjudicatedCommand(node: INode, controlStreamId: string, command: ConfigCommand | string) {
    console.log("Adjudication Body:", command);
    let ep = node.getConnectedSystemsEndpoint(false) + `/controlstreams/${controlStreamId}/commands`
    let response = await fetch(ep, {
        method: "POST",
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: command instanceof ConfigCommand ? command.getJsonString() : command
    })
    if (response.ok) {
        let json = await response.json();
        console.log("Config Command Response", json)


    } else {
        console.warn("[Config] Sending config command failed", response)
    }
}

export function generateCommandJSON(observationId: string, setConfig: boolean) {
    return JSON.stringify({
        "params": {
            'observationId': observationId,
            'setConfig': setConfig
        }
    })
}

export async function insertConfigSystem(node: INode){
    let configSystemJSON =
        {
            "type": "PhysicalSystem",
            "id": "0",
            "uniqueId": "urn:ornl:oscar:client:config",
            "definition": "http://www.w3.org/ns/sosa/Sensor",
            "label": "OSCAR Client Config",
            "validTime": [
                "2025-04-29T22:30:03Z",
                "now"
            ]
        }

    // let configSystemJSON = {
    //     "type": "SimpleProcess",
    //     "uniqueId": "urn:ornl:oscar:client:config",
    //     "label": `Config`,
    //     "definition": "sosa:System"
    // }

    // @ts-ignore

    console.log("[CONFIG] Inserting Config System: ", configSystemJSON);
    let sysId: string = await insertSystem(node, configSystemJSON);

    console.log("[CONFIG] Inserted Config System: ", sysId);
    return sysId;
}

export async function insertConfigDatastream(node: INode, systemId: string){
    let dsId = await insertDatastream(systemId, ConfigDatastreamConstant);

    if(!dsId){
        console.log("[ERROR] Inserting Config Datastream");
        return null;
    }else{
        console.log("Config Datastream Inserted: ", dsId);
        return dsId;
    }
}

export async function checkForConfigDatastream(node: INode, systemId: string): Promise<string>{
    if(!node) return null;

    const systems = await node.fetchSystems();

    const configSystem = systems.find((system: any) => system.properties.properties.uid == "urn:ornl:oscar:client:config");

    console.log("jey", configSystem)
    if(configSystem){
        let dsCollection = await configSystem.searchDataStreams(new DataStreamFilter(), 1000);

        console.log("jey", dsCollection)
        if(dsCollection.hasNext()){
            let datastreams = await dsCollection.nextPage();

            console.log("jey", datastreams)
            if(datastreams.length > 0){
                console.log("jey", datastreams[0].properties.id)
                return datastreams[0].properties.id;
            }else{
                return null;
            }
        }

    }
}


export async function retrieveLatestConfig(node: INode) {
    let apiFound = await node.checkForEndpoint();

    if (apiFound) {
        const systems = await node.fetchSystems();

        const configSystem = systems.find((system: any) => system.properties.properties.uid == "urn:ornl:oscar:client:config");

        if(configSystem){
            const dsCollection = await configSystem.searchDataStreams(new DataStreamFilter(), 1);

            if(dsCollection.hasNext()) {
                let ds = await dsCollection.nextPage();

                console.log("latestConfigDs", ds)
                return ds[0];
            }
        }

    }
}


export const ConfigDatastreamConstant: any = {
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
                        "name": "nodeCount",
                        "label": "Node Count",
                        "id": "nodeCount"
                    },
                    {
                        "type": "DataArray",
                        "label": "Nodes",
                        "definition": "http://www.test.org/def/nodes",
                        "name": "Nodes",
                        "elementCount": {
                            "href": "#nodeCount"
                        },
                        "elementType": {
                            "type": "DataRecord",
                            "name": "nodes",
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
                                    "label": "sos Endpoint"
                                },
                                {
                                    "type": "Text",
                                    "name": "csAPIEndpoint",
                                    "definition": "http://sensorml.com/ont/swe/property/csAPIEndpoint",
                                    "label": "cs API Endpoint"
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


