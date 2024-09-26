/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Box, Button} from "@mui/material";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice, selectDefaultNode} from "@/lib/state/OSHSlice";
import System from "osh-js/source/core/sweapi/system/System.js";
import SensorWebApi from "osh-js/source/core/sweapi/SensorWebApi.js";
import Systems from "osh-js/source/core/sweapi/system/Systems";
import SystemFilter from "osh-js/source/core/sweapi/system/SystemFilter.js";
import {INode} from "@/lib/data/osh/Node";
import {useEffect} from "react";


export default function TestStateWriter() {
    // access the state
    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshSlice);
    const defaultNode = useSelector(selectDefaultNode);

    function blobToString(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsText(blob);
        });
    }

    function checkForSystem(defaultNode: INode) {
        let systemsApi = new Systems({
            endpointUrl: defaultNode.getConnectedSystemsEndpoint(),
            tls: defaultNode.isSecure,
            connectorOpts: defaultNode.auth
        });
        systemsApi.searchSystems(new SystemFilter({
            uid: "urn:ornl:oscar:client:config"
        }), (systems: any) => {
            console.log("Config Found Systems: ", systems);
            if(systems.length === 0){
                insertConfigSystem(defaultNode).then((response) => {
                    console.log("Config System Inserted: ", response);
                });
            }
        });
    }

    async function insertConfigSystem(defaultNode: INode) {

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

        let ep: string = `${defaultNode.getConnectedSystemsEndpoint()}/systems`;

        const response = await fetch(ep, {
            method: 'POST',
            body: cfgSystemJSON,
            headers: {
                ...defaultNode.getBasicAuthHeader(),
                'Content-Type': 'application/swe+json'
            }
        });
        return response;
    }

    useEffect(() => {
        if(defaultNode) {
            console.log("Default Node: ", defaultNode);
            checkForSystem(defaultNode);
        }
    }, [defaultNode]);

    const handleSaveState = async () => {
        // call OSHSliceWriter.writeSliceToBlob
        let writer = new OSHSliceWriterReader("http://192.168.1.158:8782/sensorhub/configs/datastreams/ko62rfqbgs5cs/observations");
        // let blob = writer.writeSliceToBlob(oshSlice);
        let obs = writer.writeSliceToString(oshSlice);
        console.log(obs);
        let resp = await writer.sendBlobToServer(obs);
        console.log(resp);
    }

    return (
        <Box>
            <h1>Save Current State!</h1>
            <Button onClick={handleSaveState}>
                Save
            </Button>
        </Box>
    );
}
