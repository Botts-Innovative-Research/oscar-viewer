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
    Container, Snackbar, SnackbarCloseReason,
    Stack,
    TextField,
    Typography,
    useMediaQuery,
    useTheme
} from "@mui/material";

import {useSelector} from "react-redux";
import { selectDefaultNode, selectNodes, setNodes} from "@/lib/state/OSHSlice";
import React, {useCallback, useEffect, useState} from "react";
import { selectCurrentUser, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {Node, NodeOptions} from "@/lib/data/osh/Node";
import Divider from "@mui/material/Divider";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ConfigData, {
    getConfigDataStreamID, getConfigSystemID,
    retrieveLatestConfigDataStream
} from "@/lib/data/oscar/Config";
import {RootState} from "@/lib/state/Store";

export default function LoadStateForm() {
    const dispatch = useAppDispatch();
    const defaultNode = useSelector((state: RootState) => state.oshSlice.configNode);

    const newNodeOpts: NodeOptions = {
        name: "",
        address: "localhost",
        port: 0,
        oshPathRoot: "/sensorhub",
        csAPIEndpoint: "/api",
        auth: {username: "", password: ""},
        isSecure: false,
        isDefaultNode: false
    };

    const [loadNodeOpts, setLoadNodeOpts] = useState<NodeOptions>(newNodeOpts);
    const [targetNode, setTargetNode] = useState<Node>(new Node(newNodeOpts));

    const [activeAlert, setActiveAlert] =useState<'save'| 'load'| 'saveload' | null>(null);
    const theme = useTheme();

    const [openSaveSnack, setOpenSaveSnack] = useState(false);
    const [openSnack, setOpenSnack] = useState(false);

    const [loadSnackMsg, setLoadSnackMsg] = useState<string>();
    const [saveSnackMsg, setSaveSnackMsg] = useState<string>();

    const [colorLoadStatus, setLoadColorStatus]= useState('');

    useEffect(() => {
        setLoadNodeOpts({...loadNodeOpts, ...defaultNode});
    }, []);


    const handleLoadState = async () => {

        let latestConfigDs = await retrieveLatestConfigDataStream(targetNode);

        if(latestConfigDs){

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);

            if(latestConfigData != null){
                setLoadSnackMsg('OSCAR State Loaded')
                setLoadColorStatus('success')

                dispatch(setCurrentUser(latestConfigData[0].user));

                let nodes = latestConfigData[0].nodes;
                dispatch(setNodes(nodes));
            }

        }else{
            setLoadSnackMsg('Failed to load OSCAR State')
            setLoadColorStatus('error')
        }
        setOpenSnack(true)
        setActiveAlert(null)
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

    const handleChangeLoadForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;

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

    useEffect(() => {
        setTargetNode(new Node(loadNodeOpts));
    }, [loadNodeOpts]);


    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway')
            return;

        setOpenSnack(false);
        setOpenSaveSnack(false);
    };

    return (
        <Card variant={"outlined"}>
            <CardHeader title={"Load Config Options"}/>
            <CardContent>
                <Stack spacing={2}>
                    <TextField label="Server Address" name="address" value={loadNodeOpts.address}
                               onChange={handleChangeLoadForm}/>
                    <TextField label="Server Port" name="port" value={loadNodeOpts.port}
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
                    <Button onClick={() => setActiveAlert('load')} variant={"contained"} color={"primary"}
                            disabled={activeAlert === 'load'}>
                        Load State
                    </Button>
                    {activeAlert === 'load' && (
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
                                    <Button color={"error"} variant="contained" onClick={() => setActiveAlert(null)}>
                                        Cancel
                                    </Button>
                                </Stack>
                            </Container>
                        </Alert>
                    )}
                    <Snackbar
                        id="load-snackbar"
                        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                        open={openSnack}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={loadSnackMsg}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: colorLoadStatus === 'success' ? 'green' : 'red',
                            },
                        }}
                    />
                </Stack>
            </CardContent>
        </Card>

    );
}

