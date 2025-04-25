/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IOSHSlice} from "@/lib/state/OSHSlice";

import SystemFilter from "osh-js/source/core/ConSysApi/system/SystemFilter.js";
import Systems from "osh-js/source/core/ConSysApi/system/Systems.js";
import {INode, Node} from "@/lib/data/osh/Node";
import DataStream from "osh-js/source/core/ConSysApi/datastream/DataStream.js";
import System from "osh-js/source/core/ConSysApi/system/System.js";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import OSCARClientSlice, {IOSCARClientState} from "@/lib/state/OSCARClientSlice";

const CONFIG_UID = "urn:ornl:oscar:client:config";

export class OSHSliceWriterReader {
    destinationURL: string;
    configNode: Node;

    constructor(destinationURL: string) {
        this.destinationURL = destinationURL;
    }

    writeSliceToBlob(slice: IOSHSlice) {
        let obs: any = {
            "time": Date.now(),
            "filename": "testcfg.json",
            "filedata": JSON.stringify(slice)
        }

        const blob = new Blob([obs], {type: 'application/json'});
        return blob;
    }

    static writeConfigToString(configData: {
        oscarData: IOSCARClientState,
        oshData: IOSHSlice
    }, filename: string = "testcfg.json") {

        console.log("Writing config to string: ", configData);
        let data = {
            user: {
                name: configData.oscarData.currentUser,
            },
            nodes: configData.oshData.nodes,
        }


        let obs: any = {
            "time": Date.now(),
            "filename": filename + ".json",
            "filedata": JSON.stringify(data)
        }

        return JSON.stringify(obs);
    }

    static async sendBlobToServer(node: INode, dsId: string, body: string) {

        let epUri = encodeURIComponent(`f=application/om+json&resultTime=latest`);
        let ep = `${node.getConnectedSystemsEndpoint()}/datastreams/${dsId}/observations?`;

        const response = await fetch(ep, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': 'Basic ' + btoa(`admin:admin`),
                'Content-Type': 'application/swe+json'
            },
            mode: 'cors',
        });
        return response;
    }

    async retrieveLatestConfigFromNode() {
        let cfgEP = this.configNode.getConfigEndpoint();
        // assume that the local server may have a config file that can be loaded
        let localConfigResp = await fetch(`${cfgEP}/systems?uid=urn:ornl:client:configs`)
        // TODO: move this into a method in the slice writer/reader or somewhere else so it's 1 reusable and 2 not clogging up this Context file
        let localConfigJson = await localConfigResp.json();
        let systemId = localConfigJson.items[0].id;
        // get datastream ID
        let configDSResp = await fetch(`${cfgEP}/systems/${systemId}/datastreams`)
        let configDSJson = await configDSResp.json();
        let dsID = configDSJson.items[0].id;
        // fetch the latest result
        let cfgObsResp = await fetch(`${cfgEP}/datastreams/${dsID}/observations?f=application/om+json&resultTime=latest`)
        let cfgObsJson = await cfgObsResp.json();
        let cfgObservation = cfgObsJson.items[0];
        // get the config object file data
        let configString = cfgObservation.result.filedata;
        // let configObj = JSON.parse(configString);
    }

    static async checkForEndpoint(node: INode) {
        let ep: string = `${node.getConnectedSystemsEndpoint()}`;
        console.log("Checking for API endpoint: ", ep, node);

        const response = await fetch(ep, {
            method: 'GET',
            mode: 'cors',
            headers: {
                ...node.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            console.log("API Endpoint found: ", response);
            return true;
        } else {
            console.warn("Error checking for API endpoint: ", response);
            return false;
        }
    }

    static async insertConfigSystem(node: INode) {

        let cfgSystemJSON: string = JSON.stringify({
            "type": "PhysicalSystem",
            "id": "0",
            "definition": "http://www.w3.org/ns/sosa/Sensor",
            "uniqueId": "urn:ornl:oscar:client:config",
            "label": "OSCAR Client Configuration System",
            "description": "Stores configuration files for the OSCAR Client",
            "contacts": [
                {
                    "role": "http://sensorml.com/ont/swe/roles/Operator",
                    "organisationName": "TBD"
                }
            ],
            "position": {
                "type": "Point",
                "coordinates": [
                    0,
                    0
                ]
            }
        });

        let ep: string = `${node.getConnectedSystemsEndpoint()}/systems`;
        console.log("Inserting Config System: ", ep, node);

        const response = await fetch(ep, {
            method: 'POST',
            mode: 'cors',
            body: cfgSystemJSON,
            headers: {
                ...node.getBasicAuthHeader(),
                'Content-Type': 'application/sml+json'
            }
        });

        if (response.ok) {
            console.log("Config System Inserted: ", response);
            let sysId = response.headers.get("Location").split("/").pop();
            await this.insertConfigDatastream(node, sysId);
            return sysId;
        } else {
            console.warn("Error inserting config system: ", response);
        }
    }

    static async checkForConfigSystem(node: INode): Promise<string> {
        let systems = await node.fetchSystemsTK();
        console.log("TK Systems retrieved:", systems);

        let cfgSystem = systems.find((system: any) => {
            system.properties.properties?.uid === CONFIG_UID
        });

        if (!cfgSystem) {
            console.log("No config system found, attempting to create one...");
            let cfgSystem = await this.insertConfigSystem(node);
            return cfgSystem;
        } else {
            console.log("Config system found: ", cfgSystem);
            return cfgSystem.id;
        }
    }

    static async insertConfigDatastream(node: INode, systemId: string) {
        let dsJSON: string = JSON.stringify({
            "name": "Configs",
            "outputName": "Client Config",
            "schema": {
                "obsFormat": "application/swe+json",
                "recordSchema": {
                    "type": "DataRecord",
                    "label": "Config File",
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
                            "label": "File Name",
                            "name": "filename",
                            "definition": "http://botts-inc.com/definitions/clientconfig/fileName"
                        },
                        {
                            "type": "Text",
                            "label": "File Data",
                            "name": "filedata",
                            "definition": "http://botts-inc.com/definitions/clientconfig/fileData"
                        }
                    ]
                }
            }
        });

        console.log("CFG SystemID: ", systemId);
        let ep: string = `${node.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams`;
        console.log("Inserting Config Datastream: ", ep, node);
        const response = await fetch(ep, {
            method: 'POST',
            body: dsJSON,
            headers: {
                ...node.getBasicAuthHeader(),
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            console.log("Config Datastream Inserted: ", response);
            return response.headers.get("Location");
        } else {
            console.error("Error inserting config datastream: ", response);
            return null;
        }
    }

    static async checkForConfigDatastream(node: INode, systemId: string): Promise<string> {

        if (!node) return null;

        console.log("Checking for Config Datastream: ", node, systemId);

        // let systemApi = new Systems({
        //     endpointUrl: node.getConnectedSystemsEndpoint(),
        //     tls: node.isSecure,
        //     connectorOpts: node.auth
        // });

        // let datastreams = await systemApi.searchDataStreams(new SystemFilter({
        //     uid: "urn:ornl:oscar:client:config"
        // }));

        let dsResp = await fetch(`${node.getConnectedSystemsEndpoint()}/systems/${systemId}/datastreams`, {
            method: 'GET',
            headers: {
                ...node.getBasicAuthHeader()
            },
            mode: 'cors',
        });
        let datastreams;
        if (dsResp.ok) {
            datastreams = await dsResp.json();
        }

        console.log("Datastreams: ", datastreams);

        if (datastreams.items?.length === 0) {
            let dsId = await OSHSliceWriterReader.insertConfigDatastream(node, systemId)

            if (!dsId) {
                console.log("Error inserting config datastream: ");
                return null;
            } else {
                console.log("Config Datastream Inserted: ", dsId);
                return dsId;
            }
        } else {
            console.log("Config Found Datastreams: ", datastreams);
            return datastreams.items[0].id;
        }
    }

    static async retrieveLatestConfig(node: INode) {
        let apiFound = await this.checkForEndpoint(node);

        if (apiFound) {
            let sysId = await this.checkForConfigSystem(node);

            if (!sysId) return;

            let dsId = await this.checkForConfigDatastream(node, sysId);
            let epUri = encodeURIComponent(`f=application/om+json&resultTime=latest`);
            let ep = `${node.getConnectedSystemsEndpoint()}/datastreams/${dsId}/observations?${epUri}`;
            let configResp = await fetch(ep, {
                method: 'GET',
                headers: {
                    ...node.getBasicAuthHeader()
                },
                mode: 'cors',
            });

            if (configResp.ok) {
                let json = await configResp.json();
                console.log("[CFG] Config Observation: ", json.items[0]);

                if (json.items.length === 0) {
                    console.error("[CFG] No config data found in observation");
                    return null;
                } else {
                    return json.items[0];
                }
            } else {
                console.log("[CFG] Error fetching config observation: ", configResp);
            }
        } else {
            console.error("API endpoint not found for node: ", node);
            return null;
        }
    }
}
