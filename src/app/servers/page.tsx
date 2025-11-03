"use client";


import {Box, Stack} from "@mui/material";
import React from "react";
import NodeForm from "@/app/_components/servers/NodeForm";
import NodeList from "@/app/_components/servers/NodeList";
import {INode} from "@/lib/data/osh/Node";

export default function Servers() {
    const [isEditNode, setIsEditNode] = React.useState(false);
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
