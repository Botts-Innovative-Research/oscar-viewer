/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Container, Grid, Snackbar, SnackbarCloseReason,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";

import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice, selectDefaultNode, selectNodes, setNodes} from "@/lib/state/OSHSlice";
import React, {useCallback, useEffect, useState} from "react";
import {IOSCARClientState, selectCurrentUser, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {Node, NodeOptions} from "@/lib/data/osh/Node";
import Divider from "@mui/material/Divider";
import ConfigData, {
    checkForConfigDatastream, checkForConfigSystem,
    retrieveLatestConfig,
    sendConfig
} from "@/app/_components/state-manager/Config";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";


export default function StateManager() {
    const dispatch = useAppDispatch();
    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshSlice);
    const oscarSlice: IOSCARClientState = useSelector((state: RootState) => state.oscarClientSlice);
    const defaultNode = useSelector(selectDefaultNode);
    const [configDSId, setConfigDSId] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("config");

    const newNodeOpts: NodeOptions = {
        name: "New Node",
        address: "localhost",
        port: 0,
        oshPathRoot: "/sensorhub",
        sosEndpoint: "/sos",
        csAPIEndpoint: "/api",
        auth: {username: "", password: ""},
        isSecure: false,
        isDefaultNode: false
    };

    const [loadNodeOpts, setLoadNodeOpts] = useState<NodeOptions>(newNodeOpts);
    const [targetNode, setTargetNode] = useState<Node>(new Node(newNodeOpts));
    const [showLoadAlert, setShowLoadAlert] = useState<boolean>(false);
    const [showSaveAlert, setShowSaveAlert] = useState<boolean>(false);
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [openSaveSnack, setOpenSaveSnack] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    const [loadSnackMsg, setLoadSnackMsg] = useState('');
    const [saveSnackMsg, setSaveSnackMsg] = useState('');
    const [colorStatus, setColorStatus]= useState('');

    const nodes = useSelector(selectNodes)
    const currentUser = useSelector(selectCurrentUser)

    useEffect(() => {
        setLoadNodeOpts({...loadNodeOpts, ...defaultNode});
    }, []);

    const [data, setData] = useState<ConfigData>();


    const getConfigDataStream = useCallback(async () =>{
        console.log("jkkk",defaultNode)
        if(defaultNode){
            let configSysId = await checkForConfigSystem(defaultNode);

            console.log("jkkk", configSysId)
            if(configSysId){
                let dsId = await checkForConfigDatastream(defaultNode, configSysId);
                console.log("jkkk dsId", dsId)
                setConfigDSId(dsId);

                return dsId;
            }
        }
    },[defaultNode]);

    const saveConfigState = async() =>{

        let dsId = await getConfigDataStream();

        console.log("dsId", dsId)
        toggleSaveAlert();

        let phenomenonTime = new Date().toISOString();


        const user = currentUser || "Unknown";

        const tempData = new ConfigData(
            phenomenonTime,
            configDSId || "",
            user,
            nodes,
            nodes.length
        );
        console.log("temp data", tempData)

        let observation = tempData.createConfigurationObservation();
        console.log("[CONFIG] Sending Config Data: ", observation);

        const endpoint = defaultNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + dsId + "/observations";
        console.log(observation)
        await submitConfig(endpoint, observation);


    }

    const submitConfig = async(endpoint: string, observation: any) => {
        try{
            const response = await sendConfig(endpoint, observation);

            if(response.ok){
                setSaveSnackMsg('OSCAR Configuration Saved')
                setColorStatus('success')
            }else {
                setSaveSnackMsg('Failed to save OSCAR Configuration')
                setColorStatus('error')
            }
        }catch(error){
            setSaveSnackMsg('Adjudication failed to submit.')
            setColorStatus('error')
        }finally{
            setOpenSnack(true);
        }
    }


    const handleLoadState = async () => {
        toggleLoadAlert();

        let latestConfigDs = await retrieveLatestConfig(targetNode);

        console.log("retrieved latest conifg", latestConfigDs)
        if(latestConfigDs){

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);
            setLoadSnackMsg('OSCAR State Loaded')
            setColorStatus('success')

            console.log("latest config data from load state", latestConfigData)
            // dispatch(setCurrentUser(configData.user));
            //
            // let nodes = configData.nodes;
            // dispatch(setNodes(nodes));
        }else{
            setLoadSnackMsg('Failed to load OSCAR State')
            setColorStatus('error')
        }
        setOpenSnack(true)
    }

    const handleChangeForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        if (name === "File Name") {
            setFileName(value);
        }
    }

    const fetchLatestConfigObservation = async(ds: any) =>{
        const observations = ds.searchObservations(new ObservationFilter(), 15);

        while(observations.hasNext()){
            let obsResult = await observations.nextPage();
            let configData = obsResult.map((obs: any) =>{
                let data = new ConfigData(obs.result.phenomenonTime, obs.result.id, obs.result.user, obs.result.nodeCount, obs.result.nodes)
            })
            console.log("observations", observations)
        }

    }

    const handleChangeLoadForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        console.log("Changing: ", name, value);

        switch (name) {
            case "address":
                setLoadNodeOpts({...loadNodeOpts, address: value});
                break;
            case "port":
                setLoadNodeOpts({...loadNodeOpts, port: Number.parseInt(value)});
                break;
            case "sosEndpoint":
                setLoadNodeOpts({...loadNodeOpts, oshPathRoot: value});
                break;
            case "csAPIEndpoint":
                setLoadNodeOpts({...loadNodeOpts, csAPIEndpoint: value});
                break;
            case "username":
                setLoadNodeOpts({...loadNodeOpts, auth: {...loadNodeOpts.auth, username: value}});
                break;
            case "password":
                setLoadNodeOpts({...loadNodeOpts, auth: {...loadNodeOpts.auth, password: value}});
                break;
        }
    }

    function toggleLoadAlert() {
        if (showLoadAlert) {
            setShowLoadAlert(false);
        } else {
            setShowLoadAlert(true);
        }
    }

    function toggleSaveAlert() {
        if (showSaveAlert) {
            setShowSaveAlert(false);
        } else {
            setShowSaveAlert(true);
        }
    }


    useEffect(() => {
        setTargetNode(new Node(loadNodeOpts));

        const time = new Date().toISOString();
        const newData = new ConfigData(time, configDSId, currentUser || "Unknown", [defaultNode], 1);
        setData(newData);
    }, [loadNodeOpts, currentUser]);


    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
        setOpenSaveSnack(false);
    };

    return (
        <Box sx={{margin: 2, padding: 2, width: isSmallScreen ? '100%' : '75%'}}>
            <Card>
                <CardHeader title={"Configuration Management"} titleTypographyProps={{variant: "h2"}}/>
                <CardContent component="form">
                    <Box>
                        <Stack spacing={3} divider={<Divider orientation={"horizontal"} flexItem/>} direction="column">

                            <Card variant={"outlined"}>
                                <CardHeader title={"Save Config Options"}/>
                                <CardContent>
                                    <Stack spacing={2}>

                                        <TextField label="File Name" value={fileName} onChange={handleChangeForm}/>
                                        <Button onClick={toggleSaveAlert} variant={"contained"} color={"primary"}
                                                disabled={showSaveAlert}>
                                            Save
                                        </Button>
                                        {showSaveAlert && (
                                            <Alert severity={"warning"}>
                                                <AlertTitle>Please Confirm</AlertTitle>

                                                <Stack spacing={2} direction={"row"}>
                                                    <Typography>
                                                        Are you sure you want to save the configuration (and overwrite
                                                        the previous one)?
                                                    </Typography>
                                                    <Button color={"success"} variant="contained"
                                                            onClick={saveConfigState}>
                                                        Save
                                                    </Button>
                                                    <Button color={"error"} variant="contained"
                                                            onClick={toggleSaveAlert}>
                                                        Cancel
                                                    </Button>
                                                </Stack>

                                            </Alert>
                                        )}
                                        <Snackbar
                                            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                                            open={openSaveSnack}
                                            autoHideDuration={5000}
                                            onClose={handleCloseSnack}
                                            message={saveSnackMsg}
                                            sx={{
                                                '& .MuiSnackbarContent-root': {
                                                    backgroundColor: colorStatus === 'success' ? 'green' : 'red',
                                                },
                                            }}
                                        />
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Card variant={"outlined"}>
                                <CardHeader title={"Load Config Options"}/>
                                <CardContent>
                                    <Stack spacing={2}>
                                        <TextField label="Server Address" name="address" value={loadNodeOpts.address}
                                                   onChange={handleChangeLoadForm}/>
                                        <TextField label="Server Port" name="port" value={loadNodeOpts.port}
                                                   onChange={handleChangeLoadForm}/>
                                        <TextField label="Server Endpoint" name="sosEndpoint"
                                                   value={loadNodeOpts.oshPathRoot}
                                                   onChange={handleChangeLoadForm}/>
                                        <TextField label="API Endpoint" name="csAPIEndpoint"
                                                   value={loadNodeOpts.csAPIEndpoint}
                                                   onChange={handleChangeLoadForm}/>
                                        <TextField label="Server Username" name="username"
                                                   value={loadNodeOpts.auth.username}
                                                   onChange={handleChangeLoadForm}/>
                                        <TextField label="Server Password" name="password"
                                                   value={loadNodeOpts.auth.password}
                                                   onChange={handleChangeLoadForm} type={"password"}/>

                                        <Button onClick={toggleLoadAlert} variant={"contained"} color={"primary"}
                                                disabled={showLoadAlert}>
                                            Load State
                                        </Button>
                                        {showLoadAlert && (
                                            <Alert severity={"warning"}>
                                                <AlertTitle>Please Confirm</AlertTitle>
                                                <Container>
                                                    <Stack spacing={2} direction={"row"}>
                                                        <Typography>
                                                            Are you sure you want to load the configuration (and
                                                            overwrite the previous one)?
                                                        </Typography>
                                                        <Button variant={"contained"} color={"success"} onClick={handleLoadState}>
                                                            Yes
                                                        </Button>
                                                        <Button variant={"contained"} color={"error"} onClick={toggleLoadAlert}>
                                                            Cancel
                                                        </Button>
                                                    </Stack>
                                                </Container>
                                            </Alert>
                                        )}
                                        <Snackbar
                                            anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                                            open={openSnack}
                                            autoHideDuration={5000}
                                            onClose={handleCloseSnack}
                                            message={loadSnackMsg}
                                            sx={{
                                                '& .MuiSnackbarContent-root': {
                                                    backgroundColor: colorStatus === 'success' ? 'green' : 'red',
                                                },
                                            }}
                                        />
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

