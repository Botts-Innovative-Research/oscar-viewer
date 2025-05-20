/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useSelector} from "react-redux";
import {removeNode, selectNodes, setNodes} from "@/lib/state/OSHSlice";
import {RootState} from "@/lib/state/Store";
import {Box, Button, Card} from "@mui/material";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import {INode, insertObservation, Node} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";
import React from "react";
import ConfigData, {
    getConfigDataStreamID,
    getConfigSystemID,
    retrieveLatestConfigDataStream
} from "@/app/_components/state-manager/Config";
import {selectCurrentUser, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

interface NodeListProps {
    modeChangeCallback?: (editMode: boolean, editNode: INode) => void
}

export default function NodeList({modeChangeCallback}: NodeListProps) {
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const defaultNode = useSelector((state: RootState) => state.oshSlice.configNode);
    const currentUser = useSelector(selectCurrentUser)

    const setEditNode = (editNode: INode) => {
        modeChangeCallback(true, editNode);
    }

    const deleteNode = async(nodeID: string) => {
        dispatch(removeNode(nodeID));
        modeChangeCallback(false, null);
        // send request to save new/updated nodes to the configs
        const response = await saveNodesToConfig(nodeID);

        if (response.ok) {
            // load the new config
            await handleLoadState();
        }
    }


    //update the config with the new list of nodes
    const saveNodesToConfig = async(nodeId: string) => {
        //default node is the local node running on the machine unless updated :p
        if(defaultNode){
            let configSysId = await getConfigSystemID(defaultNode);

            if(configSysId){
                let dsId = await getConfigDataStreamID(defaultNode);

                if(!dsId){
                    return;
                }

                let phenomenonTime = new Date().toISOString();

                const user =  currentUser|| "Unknown";


                const nodesList = nodes.filter((node: any) => node.id !== nodeId)

                const tempData = new ConfigData(
                    phenomenonTime,
                    dsId || "",
                    user,
                    nodesList,
                    nodesList.length
                );

                let observation = tempData.createConfigurationObservation();

                const endpoint = defaultNode.getConfigEndpoint(false) + "/datastreams/" + dsId + "/observations";
                const response = await insertObservation(endpoint, observation);

                return response;

            }
        }
    }

    const fetchLatestConfigObservation = async(ds: any) =>{
        const observations = await ds.searchObservations(new ObservationFilter({ resultTime: 'latest'}), 1);

        let obsResult = await observations.nextPage();
        let configData = obsResult.map((obs: any) =>{
            let data = new ConfigData(obs.phenomenonTime, obs.id, obs.result.user, obs.result.nodes, obs.result.numNodes)
            return data;
        })

        return configData;

    }

    const handleLoadState = async () => {

        let latestConfigDs = await retrieveLatestConfigDataStream(defaultNode);

        if(latestConfigDs){

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);

            if(latestConfigData != null){


                dispatch(setCurrentUser(latestConfigData[0].user));

                let nodes = latestConfigData[0].nodes;

                nodes = nodes.map((node: any)=>{
                    return new Node(
                        {
                            name: node.name,
                            address: node.address,
                            port: node.port,
                            oshPathRoot: node.oshPathRoot,
                            sosEndpoint: node.sosEndpoint,
                            csAPIEndpoint: node.csAPIEndpoint,
                            configsEndpoint: node.configsEndpoint,
                            auth: { username: node.username, password: node.password },
                            isSecure: node.isSecure,
                            isDefaultNode: node.isDefaultNode
                        }
                    )
                })

                dispatch(setNodes(nodes));
            }

        }
    }

    const getBGColor = (isDefault: boolean) => {
        return isDefault ? "gray" : "primary";
    }

    return (
        <Box sx={{width: '100%'}}>
            <p>Nodes:</p>
            {nodes.length === 0 ? (
                <p>No Nodes</p>
            ) : (
                <List>
                    {nodes.map((node: INode) => (
                        <Card key={node.address + node.port} sx={{backgroundColor: getBGColor(node.isDefaultNode)}}>
                            <ListItem sx={{m: 0}}>
                                <ListItemText primary={node.name} secondary={node.address}/>
                                <Button variant="contained" size={"small"} color="primary" sx={{m: 1}}
                                        onClick={() => setEditNode(node)}>Edit</Button>
                                <Button variant="contained" size={"small"} color="secondary" sx={{m: 1}}
                                        onClick={() => deleteNode(node.id)}>Delete</Button>
                            </ListItem>
                        </Card>
                    ))}
                </List>
            )}
        </Box>
    )
}
