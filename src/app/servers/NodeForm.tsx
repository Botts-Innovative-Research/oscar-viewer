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
    FormControlLabel, Snackbar, SnackbarCloseReason,
    Stack,
    TextField,
    Tooltip,
    Typography
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {addNode, updateNode} from "@/lib/state/OSHSlice";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";

export default function NodeForm({isEditNode, modeChangeCallback, editNode}: {
    isEditNode: boolean,
    modeChangeCallback?: (editMode: boolean, editNode: INode) => void
    editNode?: INode
}) {


    const [openSnack, setOpenSnack] = useState(false);
    const[nodeSnackMsg, setNodeSnackMsg] = useState("");

    const dispatch = useAppDispatch();
    const newNodeOpts: NodeOptions = {
        name: "New Node",
        address: "localhost",
        port: 8282,
        oshPathRoot: "/sensorhub",
        sosEndpoint: "/sos",
        csAPIEndpoint: "/api",
        csAPIConfigEndpoint: "/configs",
        auth: {username: "", password: ""},
        isSecure: false,
        isDefaultNode: false
    };
    const [newNode, setNewNode] = useState<INode>(new Node(newNodeOpts));

    useEffect(() => {
        if (isEditNode && editNode) {
            console.log("Editing node: ", editNode);
            setNewNode(editNode);
        } else {
            console.log("Adding new node");
            const node = new Node(newNodeOpts);
            console.log(node)
            setNewNode(node);
        }
    }, [isEditNode, editNode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value, checked} = e.target;

        let tNode = new Node(newNode);
        if (name === "username") {
            tNode.auth.username = value;
        } else if (name === "password") {
            tNode.auth.password = value;
        } else if (name === "isSecure") {
            tNode.isSecure = checked;
        } else if (name === "port") {
            tNode.port = Number.parseInt(value);
        } else {
            (tNode as any)[name] = value;
        }

        setNewNode(tNode);

    };

    const handleButtonAction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditNode) {
            dispatch(updateNode(newNode));
            console.log('dispatch', dispatch(addNode(newNode)));
            modeChangeCallback(false, null);
        } else {
            dispatch(addNode(newNode));
            console.log('dispatch', dispatch(addNode(newNode)));
            modeChangeCallback(false, null);

        }
        await checkReachable(newNode)
        setOpenSnack(true)
    }

    if (!newNode) {
        return <Container><Typography variant="h4" align="center">Loading...</Typography></Container>
    }


    const handleCloseSnack = (
        event: React.SyntheticEvent | Event,
        reason?: SnackbarCloseReason,
    ) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
    };

     async function checkReachable(node: any){
         console.log('node', node)
         const endpoint = `${node.getConnectedSystemsEndpoint()}`;

         try {
             const response = await fetch(endpoint);
             if (!response.ok) {
                 setNodeSnackMsg(`Connection failed. Unreachable server at ${node.address}.`);
             } else {
                 setNodeSnackMsg(`Successfully connected to server at ${node.address}`);
             }
         } catch (error) {
             setNodeSnackMsg('Connection failed. Confirm IP, port, and server availability.');
         }
    }

    return (
        <Card sx={{margin: 2, width: '100%'}}>
            <Typography variant="h4" align="center"
                        sx={{margin: 2}}>{isEditNode ? "Edit Node" : "Add a New Server"}</Typography>
            <Box component="form" sx={{margin: 2}}>
                <Stack spacing={4}>
                    {isEditNode ? <Typography variant={"h6"}>Editing Node: {editNode.id}</Typography> : null}
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
                    <FormControlLabel control={<Checkbox name="isSecure" checked={newNode.isSecure} onChange={handleChange}/>} label="Is Secure"/>
                    <Button variant={"contained"} color={"primary"}
                            onClick={handleButtonAction}>{isEditNode ? "Save Changes" : "Add Node"}</Button>
                    <Snackbar
                        open={openSnack}
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={nodeSnackMsg}
                    />
                    <Button variant={"contained"} color={"secondary"}
                            onClick={() => modeChangeCallback(false, null)}>Cancel</Button>
                </Stack>
            </Box>
        </Card>
    )
}
