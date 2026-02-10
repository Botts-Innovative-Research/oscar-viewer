/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    Box,
    Button,
    Card,
    Checkbox,
    Container,
    FormControlLabel, Snackbar, SnackbarCloseReason,
    Stack,
    TextField,
    Typography
} from "@mui/material";
import React, {useEffect, useState} from "react";
import {addNode, selectNodes, updateNode} from "@/lib/state/OSHSlice";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useSelector} from "react-redux";
import {useLanguage} from "@/app/contexts/LanguageContext";


export default function NodeForm({isEditNode, modeChangeCallback, editNode}: {
    isEditNode: boolean,
    modeChangeCallback?: (editMode: boolean, editNode: INode | null) => void
    editNode?: INode
}) {

    const [openSnack, setOpenSnack] = useState(false);
    const [nodeSnackMsg, setNodeSnackMsg] = useState("");
    const [colorStatus, setColorStatus] = useState("");

    const dispatch = useAppDispatch();
    const nodes = useSelector(selectNodes);
    const { t } = useLanguage();

    const newNodeOpts: NodeOptions = {
        name: "",
        address: "localhost",
        port: 8282,
        oshPathRoot: "/sensorhub",
        csAPIEndpoint: "/api",
        auth: {username: "", password: ""},
        isSecure: false,
        isDefaultNode: false
    };
    const [newNode, setNewNode] = useState<INode>(new Node(newNodeOpts));

    useEffect(() => {
        if (isEditNode && editNode) {
            setNewNode(editNode);
        } else {
            const node = new Node(newNodeOpts);
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
        } else if (name === 'address'){
            tNode.address = value;
        } else{
            (tNode as any)[name] = value;
        }

        setNewNode(tNode);

    };

    const handleButtonAction = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isEditNode) {
            dispatch(updateNode(newNode));
            modeChangeCallback(false, null);
        } else {
            const hasDuplicate = nodes.some(
                (n: INode) => n.address === newNode.address && n.port === newNode.port
            );
            if (hasDuplicate) {
                setNodeSnackMsg(`Node with address ${newNode.address}:${newNode.port} already exists`);
                setColorStatus('error');
                setOpenSnack(true);
                return;
            }
            const nameExists = nodes.some((n: INode) => n.name === newNode.name);
            if (nameExists) {
                setNodeSnackMsg(`Node with name "${newNode.name}" already exists`);
                setColorStatus('error');
                setOpenSnack(true);
                return;
            }

            dispatch(addNode(newNode));
            setNodeSnackMsg(`Node "${newNode.name}" added successfully`);
            setColorStatus('success');
            setOpenSnack(true);
            modeChangeCallback(false, null);
        }
    }

    const handleAddSave = async(e: React.FormEvent)=> {

        let reachable = await checkReachable(newNode)
        setOpenSnack(true)

        if(!reachable){
            setNodeSnackMsg('Node is not reachable. Try again.')
            setColorStatus('error')
            setOpenSnack(true);
            return;
        }

        setNodeSnackMsg('Node is reachable')
        setColorStatus('success')
        setOpenSnack(true);

        // update the list of nodes using the edit/update
        handleButtonAction(e);
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
        setNodeSnackMsg('Trying to connect...')
        setColorStatus('info')
        setOpenSnack(true)


        const endpoint = `${node.getConnectedSystemsEndpoint()}`;

        const encoded = btoa(`${node.auth.username}:${node.auth.password}`);

        const options: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encoded}`
            },
            mode: 'cors',
        }

        try {
            const response = await fetch(endpoint, options);
            if (response.ok) {
                setNodeSnackMsg(`Successfully connected to server at ${node.address}`);
                setColorStatus('success')
                return true;
            }else{
                setNodeSnackMsg(`Connection failed. Unreachable server at ${node.address}.`);
                setColorStatus('error')
                return false;
            }

        } catch (error) {
            setNodeSnackMsg('Connection failed. Confirm IP, port, and server availability.');
            setColorStatus('error')
            return false;
        }
    }

    return (
        <Card sx={{margin: 2, width: '100%'}}>
            <Typography
                variant="h4"
                align="left"
                sx={{margin: 2}}
            >
                {
                    isEditNode ? t('editNode')  : t('addServer')
                }
            </Typography>

            <Box component="form" sx={{margin: 2}}>
                <Stack spacing={4}>
                    {isEditNode ? <Typography variant={"h6"}>Editing Node: {editNode.id}</Typography> : null}
                    <TextField label="Name" name="name" value={newNode.name} onChange={handleChange}/>
                    <TextField label="Address" name="address" value={newNode.address} onChange={handleChange}/>
                    <TextField label="Port" name="port" value={newNode.port} onChange={handleChange}/>
                    <TextField
                        label="CS API Endpoint"
                        name="csAPIEndpoint"
                        value={newNode.csAPIEndpoint}
                        onChange={handleChange}
                    />
                    <TextField label="Username" name="username" value={newNode.auth.username} onChange={handleChange}/>
                    <TextField label="Password" name="password" type={"password"} value={newNode.auth.password}
                               onChange={handleChange}/>

                    <FormControlLabel control={<Checkbox name="isSecure" checked={newNode.isSecure} onChange={handleChange}/>} label="Is Secure"/>

                    <Stack direction="row" spacing={2}>
                        <Button variant={"contained"} color={"primary"}
                                onClick={handleAddSave}>{isEditNode ? "Save Changes" : "Add Node"}</Button>
                        <Button variant={"outlined"} color={"secondary"}
                                onClick={() => modeChangeCallback(false, null)}>Cancel</Button>
                    </Stack>


                    <Snackbar
                        id="saveNode-snackbar"
                        open={openSnack}
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={nodeSnackMsg}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: colorStatus === 'success' ? 'green' : colorStatus === 'error' ? 'red' : 'orange',
                            },
                        }}
                    />

                </Stack>
            </Box>
        </Card>
    )
}
