/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IOSHSlice} from "@/lib/state/OSHSlice";

import SystemFilter from "osh-js/source/core/sweapi/system/SystemFilter.js";
import Systems from "osh-js/source/core/sweapi/system/Systems.js";
import {Node} from "@/lib/data/osh/Node";

export class OSHSliceWriterReader {
    destinationURL: string;
    configNode: Node;

    constructor(destinationURL: string){
        this.destinationURL = destinationURL;
    }

    writeSliceToBlob(slice: IOSHSlice){
        let obs: any = {
            "time": Date.now(),
            "filename": "testcfg.json",
            "filedata": JSON.stringify(slice)
        }

        const blob = new Blob([obs], {type: 'application/json'});
        return blob;
    }

    writeSliceToString(slice: IOSHSlice){
        let obs: any = {
            "time": Date.now(),
            "filename": "testcfg.json",
            "filedata": JSON.stringify(slice)
        }

        return JSON.stringify(obs);
    }

    async sendBlobToServer(body: string){
        // const formData = new FormData();
        // formData.append('file', blob);


        const response = await fetch(this.destinationURL, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': 'Basic ' + btoa(`admin:admin`),
                'Content-Type': 'application/swe+json'
            }
        });
        return response;
    }

    async retrieveLatestConfigFromNode(){
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
        let configObj = JSON.parse(configString);
    }
}
