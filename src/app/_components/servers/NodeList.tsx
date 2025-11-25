/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useSelector} from "react-redux";
import {removeNode, selectNodes, setNodes} from "@/lib/state/OSHSlice";
import {RootState} from "@/lib/state/Store";
import {Box, Button, Card, Typography} from "@mui/material";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import {INode, Node} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";
import React from "react";

interface NodeListProps {
    modeChangeCallback?: (editMode: boolean, editNode: INode) => void
}

export default function NodeList({modeChangeCallback}: NodeListProps) {
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const setEditNode = (editNode: INode) => {
        modeChangeCallback(true, editNode);
    }

    const deleteNode = async(nodeID: string) => {
        dispatch(removeNode(nodeID));
        modeChangeCallback(false, null);
    }

    const getBGColor = (isDefault: boolean) => {
        return isDefault ? "gray" : "primary";
    }

    return (
        <Box sx={{width: '100%'}}>
            <Typography variant="h4" align="left" sx={{margin: 2}}>Nodes</Typography>
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
