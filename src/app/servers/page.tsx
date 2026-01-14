"use client";

import {Box, Grid, Stack} from "@mui/material";
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
        <Grid container spacing={2} width={"100%"} direction={{ xs: "column-reverse", md: "row" }}>
            <Grid item xs={12} md={6}>
                <NodeList modeChangeCallback={handleModeChange}/>
            </Grid>
            <Grid item xs={12} md={6}>
                <NodeForm isEditNode={isEditNode} modeChangeCallback={handleModeChange} editNode={selectedNode}/>
            </Grid>
        </Grid>
    )
}
