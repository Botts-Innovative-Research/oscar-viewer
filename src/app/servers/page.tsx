"use client";

// create form component
import {Box, Stack} from "@mui/material";
import React from "react";
import NodeForm from "@/app/servers/AddNode";
import NodeList from "@/app/servers/NodeList";
import {INode} from "@/lib/data/osh/Node";

export default function Servers() {
    const [isEditNode, setIsEditNode] = React.useState(true);
    const [selectedNode, setSelectedNode] = React.useState(null);

    const handleModeChange = (editMode: boolean, editNode: INode) =>{
        setIsEditNode(editMode);
        setSelectedNode(editNode);
    }

    return (
        <Box sx={{margin: 2, width: '100%', padding: 2}}>
            <Stack direction="row" spacing={2}>
                <NodeList modeChangeCallback={handleModeChange}/>
                <NodeForm isEditNode={isEditNode} modeChangeCallback={handleModeChange} editNode={selectedNode}/>
            </Stack>
        </Box>
    )
}
