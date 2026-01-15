"use client";

import { Button, Collapse, Grid} from "@mui/material";
import React from "react";
import NodeForm from "@/app/_components/servers/NodeForm";
import NodeList from "@/app/_components/servers/NodeList";
import {INode} from "@/lib/data/osh/Node";
import { useBreakpoint } from "../providers";
import { ButtonProps } from "@mui/material/Button";

interface mobileButton {
  text: string;
  variant: ButtonProps["variant"];
  color: ButtonProps["color"];
}

export default function Servers() {
    const { isMobile } = useBreakpoint();

    const [isEditNode, setIsEditNode] = React.useState(false);
    const [selectedNode, setSelectedNode] = React.useState(null);
    const [mobileFormOpen, setMobileFormOpen] = React.useState(false);

    const handleModeChange = (editMode: boolean, editNode: INode) => {
        setIsEditNode(editMode);
        setSelectedNode(editNode);

        // Handle form visibility for mobile
        if (isMobile && editMode) {
            setMobileFormOpen(true)  // Open form
        } else {
            setMobileFormOpen(false) // Close form
        }
    }

    const handleMobileForm = () => {
        setMobileFormOpen(!mobileFormOpen);
        
        // Cancel edit mode if applicable
        if (isEditNode) {
            setIsEditNode(false);
            setSelectedNode(null);
        }
    }
    

    // Styling for mobile form
    const mobileButtonConfig: mobileButton = React.useMemo(() => ({
        text: mobileFormOpen ? "Cancel" : "Add Node",
        variant: mobileFormOpen ? "outlined" : "contained",
        color: mobileFormOpen ? "secondary" : "primary",
    }), [mobileFormOpen])

    return (
        <Grid container spacing={2} width={"100%"} direction={{ xs: "column-reverse", md: "row" }}>
            <Grid item xs={12} md={6}>
                <NodeList modeChangeCallback={handleModeChange}/>
            </Grid>
            {isMobile ? (
                <Grid item md={6}>
                    <Button variant={mobileButtonConfig.variant} color={mobileButtonConfig.color} onClick={handleMobileForm} fullWidth>
                        {mobileButtonConfig.text}
                    </Button>
                    <Collapse in={mobileFormOpen} sx={{ pt: 2 }} unmountOnExit>
                        <NodeForm isEditNode={isEditNode} modeChangeCallback={handleModeChange} editNode={selectedNode}/>
                    </Collapse>
                </Grid>
            ) : (
                <Grid item md={6}>
                    <NodeForm isEditNode={isEditNode} modeChangeCallback={handleModeChange} editNode={selectedNode}/>
                </Grid>
            )}
        </Grid>
    )
}
