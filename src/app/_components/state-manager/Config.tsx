


//{"user":{"name":""},
// "nodes":[{"auth":{"username":"admin","password":"oscar"},"laneAdjMap":{},"id":"node-f940fc5c-6f47-df79-b3f5-c2c2e539182f","name":"Local Node","address":"127.0.0.1","port":8282,"oshPathRoot":"/sensorhub","sosEndpoint":"/sos","csAPIEndpoint":"/api","csAPIConfigEndpoint":"/configs","isSecure":false,"isDefaultNode":true}]}

import { insertSystem, insertDatastream } from "@/lib/data/Constants";
import {INode, Node} from "@/lib/data/osh/Node";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter";


const CONFIG_UID = "urn:ornl:oscar:client:config";

export interface IUser{
    name: string;
}

export interface IConfigData{
    time: string,
    id: string,
    user: IUser,
    node: Node[],
}

export default class ConfigData implements IConfigData{
    time: string;
    id: string;
    user: IUser;
    node: Node[];

    constructor(time: string, id: string, user: IUser){
        this.time = time;
        this.id = id;
        this.user = user;
        // this.node = Node;
    }

    setTime(time: string){
        this.time = time;
    }

    setId( id: string){
        this.id = id;
    }

    setUser(user: IUser){
        this.user = user;
    }

    setNode(node: Node[]){
        this.node = node;
    }

    getTime() {
        return this.time;
    }

    getId(){
        return this.id;
    }

    getUser(){
        return this.user;
    }

    getNode(){
        return this.node;
    }

    createConfigurationObservation(){
        console.log("Creating configuarion observation: ", this);

        let observation = {
            "phenomenonTime": this.time,
            "result":{
                "user": this.user,
                "node": this.node
            }
        }

        // return observation
        let obsJson = JSON.stringify(observation, ['phenomenonTime', 'result', 'user', 'node'], 2);

        return obsJson;
    }
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
            "node": data.node
        }
    }

    // return observation
    let obsJson = JSON.stringify(observation, ['phenomenonTime', 'result', 'user', 'node'], 2);

    return obsJson;
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

    let configSystem = systems.find((system: any) => {
        system.properties.properties?.uid === CONFIG_UID
    });

    if (!configSystem) {
    console.log("No config system found, attempting to create one...");
    let configSystem = await this.insertConfigSystem(node);
    return configSystem;
} else {
    console.log("Config system found: ", configSystem);
    return configSystem.id;
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

export async function insertConfigSystem(){
    let configSystemJSON =
        `{
            "type": "Feature",
            "id": "0",
            "geometry": null,
            "properties": {
                "uid": "urn:ornl:oscar:client:config",
                "featureType": "http://www.w3.org/ns/ssn/System",
                "name": "OSCAR Client Configuration System",
                "validTime": [
                    "2025-04-29T13:59:05.309Z",
                    "now"
                ]
            }`

    // let configSystemJSON = {
    //     "type": "SimpleProcess",
    //     "uniqueId": "urn:ornl:oscar:client:config",
    //     "label": `Config`,
    //     "definition": "sosa:System"
    // }

    console.log("[CONFIG] Inserting Config System: ", configSystemJSON);
    let sysId: string = await insertSystem(configSystemJSON);

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

    if(configSystem){
        let dsCollection = configSystem.searchDataStreams(new DataStreamFilter(), 1000);

        if(dsCollection.hasNext()){
            let datastreams = await dsCollection.nextPage();

            if(datastreams.length > 0){
                return datastreams;
            }else{
                return null;
            }
        }

    }
}

export async function retrieveLatestConfig(node: INode) {
    let apiFound = await node.checkForEndpoint();

    if (apiFound) {
        let sysId = await checkForConfigSystem(node);

        if (!sysId) return;

        const dsId = await checkForConfigDatastream(node, sysId)
    }
}

export const ConfigDatastreamConstant: any =
    {
        "name": "Config",
        "outputName": "Config",
        "schema": {
            "obsFormat": "application/json",
            "resultSchema": {
                "type": "DataRecord",
                "definition": "urn:osh:data:config",
                "label": "OSCAR Configuration Record",
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
                        "definition": "http://sensorml.com/ont/swe/property/nodeCount",
                        "label": "Node Count",
                        "id": "nodeCount"
                    },
                    {
                        "type": "DataArray",
                        "label": "Nodes",
                        "updatable": false,
                        "optional": false,
                        "definition": "http://www.test.org/def/nodes",
                        "name": "Nodes",
                        "elementCount": {
                            "type": "Link",
                            "href": "#nodeCount"
                        },
                        "elementType": {
                            "type": "DataRecord",
                            "name": "node",
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




