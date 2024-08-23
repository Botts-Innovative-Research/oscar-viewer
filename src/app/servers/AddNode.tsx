/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// create form component
import {
    Box,
    Button,
    Card,
    Checkbox,
    Container,
    FormControlLabel,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {RootState} from "@/lib/state/Store";
import {addNode, selectNodes, updateNode} from "@/lib/state/OSHSlice";
import {useSelector} from "react-redux";
import {INode, Node} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";

export default function NodeForm({isEditNode, modeChangeCallback, editNode}: {
    isEditNode: boolean,
    modeChangeCallback?: (editMode: boolean, editNode: INode) => void
    editNode?: INode
}) {
    const dispatch = useAppDispatch();
    const justNodes: INode[] = useSelector((state: RootState) => selectNodes(state));
    const [newNode, setNewNode] = useState<INode>(new Node(
        0,
        "New Node",
        "http://localhost",
        0,
        "/sensorhub",
        "/sos",
        "/api",
        "/configs",
        {username: "", password: ""},
        false
    ));

    useEffect(() => {
        if (isEditNode && editNode) {
            console.log("Editing node: ", editNode);
            setNewNode(editNode);
        } else {
            console.log("Adding new node");
            setNewNode(new Node(
                justNodes.length + 1,
                "New Node",
                "http://localhost",
                0,
                "/sensorhub",
                "/sos",
                "/api",
                "/configs",
                {username: "", password: ""},
                false
            ));
        }
    }, [isEditNode, editNode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, checked} = e.target;

        let tNode = {...newNode};
        if (name === "username") {
            tNode.auth.username = value;
        } else if (name === "password") {
            tNode.auth.password = value;
        } else if (name === "isSecure") {
            tNode.isSecure = checked;
        } else {
            (tNode as any)[name] = value;
        }
        setNewNode(tNode);
    };

    const handleButtonAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditNode) {
            dispatch(updateNode(newNode));
            modeChangeCallback(false, null);
        } else {
            dispatch(addNode(newNode));
            modeChangeCallback(false, null);
        }
    }

    if (!newNode){
        return <Container><Typography variant="h4" align="center">Loading...</Typography></Container>
    }


    return (
        <Card sx={{margin: 2, width: '100%'}}>
            <Typography variant="h4" align="center"
                        sx={{margin: 2}}>{isEditNode ? "Edit Node" : "Add a New Server"}</Typography>
            <Box component="form" sx={{margin: 2}}>
                <Stack spacing={4}>
                    <TextField label="ID" name="id" value={newNode.id} onChange={handleChange} disabled={isEditNode}/>
                    <TextField label="Name" name="name" value={newNode.name} onChange={handleChange}/>
                    <TextField label="Address" name="address" value={newNode.address} onChange={handleChange}/>
                    <TextField label="Port" name="port" value={newNode.port} onChange={handleChange}/>
                    <TextField label="Node Endpoint" name="sosEndpoint" value={newNode.sosEndpoint}
                               onChange={handleChange}/>
                    <TextField label="CS API Endpoint" name="csAPIEndpoint" value={newNode.csAPIEndpoint}
                               onChange={handleChange}/>
                    <Tooltip title={"The endpoint for the configuration API"}>
                        <TextField label="Config Endpoint" name="csAPIConfigEndpoint"
                                   value={newNode.csAPIConfigEndpoint}
                                   onChange={handleChange}/>
                    </Tooltip>
                    <TextField label="Username" name="username" value={newNode.auth.username} onChange={handleChange}/>
                    <TextField label="Password" name="password" type={"password"} value={newNode.auth.password}
                               onChange={handleChange}/>
                    <FormControlLabel
                        control={<Checkbox name="isSecure" checked={newNode.isSecure} onChange={handleChange}/>}
                        label="Is Secure">
                    </FormControlLabel>
                    <Button variant={"contained"} color={"primary"}
                            onClick={handleButtonAction}>{isEditNode ? "Save Changes" : "Add Node"}</Button>
                    <Button variant={"contained"} color={"secondary"}
                            onClick={() => modeChangeCallback(false, null)}>Cancel</Button>
                </Stack>
            </Box>

        </Card>
    )
}
