/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// create form component
import {
    Alert,
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
import {addNode, selectNodes, setNodes, updateNode} from "@/lib/state/OSHSlice";
import {INode, insertObservation, Node, NodeOptions} from "@/lib/data/osh/Node";
import {useAppDispatch} from "@/lib/state/Hooks";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import ConfigData, {
    getConfigDataStreamID,
    getConfigSystemID,
    retrieveLatestConfigDataStream
} from "@/app/_components/state-manager/Config";
import {selectCurrentUser, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";


export default function NodeForm({isEditNode, modeChangeCallback, editNode}: {
    isEditNode: boolean,
    modeChangeCallback?: (editMode: boolean, editNode: INode) => void
    editNode?: INode
}) {

    const [openSnack, setOpenSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState("");
    const [severity, setSeverity] = useState<'success'| 'error'>("success");

    const defaultNode = useSelector((state: RootState) => state.oshSlice.configNode);
    const currentUser = useSelector(selectCurrentUser)
    const nodes = useSelector((state: RootState) => selectNodes(state));

    const dispatch = useAppDispatch();

    const newNodeOpts: NodeOptions = {
        name: "",
        address: "localhost",
        port: 8282,
        oshPathRoot: "/sensorhub",
        sosEndpoint: "/sos",
        csAPIEndpoint: "/api",
        configsEndpoint: "/configs",
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
            dispatch(addNode(newNode));
            modeChangeCallback(false, null);

        }

    }

    const handleAddSave = async(e: React.FormEvent)=> {

        let reachable = await checkReachable(newNode)
        setOpenSnack(true)

        if(!reachable){
            setSnackMessage('Node is not reachable. Try again.')
            setSeverity('error')
            setOpenSnack(true);
            return;
        }

        // update the list of nodes using the edit/update
        handleButtonAction(e);


        // send request to save new/updated nodes to the configs
        const response = await saveNodesToConfig();


        if (response.ok) {
            setSnackMessage('OSCAR Configuration Saved')
            setSeverity('success')
            setOpenSnack(true);

            // load the new config
            await handleLoadState();


        } else {
            setSnackMessage('Failed to save OSCAR Configuration.')
            setSeverity('error')
            setOpenSnack(true);
        }
    }


    const saveNodesToConfig = async() => {
        //default node is the local node running on the machine unless updated :p
        if(defaultNode){
            let configSysId = await getConfigSystemID(defaultNode);

            if(configSysId){
                let dsId = await getConfigDataStreamID(defaultNode);

                if(!dsId){
                    setSnackMessage('Failed to find config datastream')
                    setSeverity('error')
                    setOpenSnack(true);
                }

                let phenomenonTime = new Date().toISOString();

                const user =  currentUser|| "Unknown";


                const nodesList = isEditNode
                    ? nodes.map((n: any) => n.id === newNode.id ? newNode : n)
                    : [...nodes, newNode];

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



    const handleLoadState = async () => {

        let latestConfigDs = await retrieveLatestConfigDataStream(defaultNode);

        if(latestConfigDs){

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);

            if(latestConfigData != null){
                setSnackMessage('OSCAR State Loaded')
                setSeverity('success')

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

        }else{
            setSnackMessage('Failed to load OSCAR State')
            setSeverity('error')
        }
        setOpenSnack(true)
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
        const endpoint = `${node.getConnectedSystemsEndpoint()}`;

        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                setSnackMessage(`Successfully connected to server at ${node.address}`);
                setSeverity('success')
                return true;
            }else{
                setSnackMessage(`Connection failed. Unreachable server at ${node.address}.`);
                setSeverity('error')
                return false;
            }

        } catch (error) {
            setSnackMessage('Connection failed. Confirm IP, port, and server availability.');
            setSeverity('error')
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
                        <TextField label="Config Endpoint" name="configsEndpoint"
                                   value={newNode.configsEndpoint}
                                   onChange={handleChange}/>
                    </Tooltip>
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
                        open={openSnack}
                        anchorOrigin={{ vertical:'top', horizontal:'center' }}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                    >
                        <Alert
                            severity={severity}
                            onClose={handleCloseSnack}
                        >
                            {snackMessage}
                        </Alert>
                    </Snackbar>

                </Stack>
            </Box>
        </Card>
    )
}
