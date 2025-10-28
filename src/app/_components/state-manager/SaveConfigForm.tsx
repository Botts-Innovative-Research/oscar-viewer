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

export default function SaveConfigForm() {
    const dispatch = useAppDispatch();
    const defaultNode = useSelector((state: RootState) => state.oshSlice.configNode);
    const [configDSId, setConfigDSId] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("config");

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

    const [colorSaveStatus, setSaveColorStatus]= useState('');
    const [colorLoadStatus, setLoadColorStatus]= useState('');

    const nodes = useSelector(selectNodes)
    const currentUser = useSelector(selectCurrentUser)

    useEffect(() => {
        setLoadNodeOpts({...loadNodeOpts, ...defaultNode});
    }, []);


    const getConfigDataStream = useCallback(async () =>{
        if(defaultNode){

            let configDataSteamId =  await getConfigDataStreamID(defaultNode)
            if(configDataSteamId)
                setConfigDSId(configDataSteamId);

            return configDataSteamId;
        }
    },[defaultNode]);

    const saveConfigState = async() =>{

        let dsId = await getConfigDataStream();

        if(!dsId){
            setSaveSnackMsg('Failed to find config datastream')
            setSaveColorStatus('error')
            setOpenSaveSnack(true);
        }

        let phenomenonTime = new Date().toISOString();

        const user = currentUser || "Unknown";

        // const tempData = new ConfigData(
        //     phenomenonTime,
        //     configDSId || "",
        //     user,
        //     nodes,
        //     nodes.length
        // );
        //
        // let observation = tempData.createConfigurationObservation();
        //
        // const endpoint = defaultNode.getConnectedSystemsEndpoint(false) + "/datastreams/" + dsId + "/observations";

        // await submitConfig(endpoint, observation);
    }

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

    const handleChangeForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        if (name === "File Name") {
            setFileName(value);
        }
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


    useEffect(() => {
        setTargetNode(new Node(loadNodeOpts));

    }, [loadNodeOpts]);


    const handleCloseSnack = (event: React.SyntheticEvent | Event, reason?: SnackbarCloseReason,) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpenSnack(false);
        setOpenSaveSnack(false);
    };

    const handleSaveLoadState = async() =>{
        // await saveConfigState();
        await handleLoadState();

    }

    return (

        <Card variant={"outlined"}>
            <CardHeader title={"Save Config Options"}/>
            <CardContent>
                <Stack spacing={2}>
                    <Button onClick={() => setActiveAlert('save')} variant={"contained"} color={"primary"}
                            disabled={activeAlert ==='save'}>
                        Save
                    </Button>
                    <Button onClick={() => setActiveAlert('saveload')} variant={"outlined"} color={"primary"}
                            disabled={activeAlert === 'saveload'}>
                        Save and Load
                    </Button>
                    {activeAlert === 'saveload' && (
                        <Alert severity={"warning"}>
                            <AlertTitle>Please Confirm</AlertTitle>
                            <Stack spacing={2} direction={"row"}>
                                <Typography>
                                    Are you sure you want to save and load the current configuration (and overwrite
                                    the previous one)?
                                </Typography>
                                <Button color={"success"} variant="contained" onClick={handleSaveLoadState}>
                                    Save
                                </Button>
                                <Button color={"error"} variant="contained" onClick={() => setActiveAlert(null)}>
                                    Cancel
                                </Button>
                            </Stack>
                        </Alert>
                    )}
                    {activeAlert ==='save' && (
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
                                        onClick={() => setActiveAlert(null)}>
                                    Cancel
                                </Button>
                            </Stack>

                        </Alert>
                    )}
                    <Snackbar
                        id="save-snackbar"
                        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                        open={openSaveSnack}
                        autoHideDuration={5000}
                        onClose={handleCloseSnack}
                        message={saveSnackMsg}
                        sx={{
                            '& .MuiSnackbarContent-root': {
                                backgroundColor: colorSaveStatus === 'success' ? 'green' : 'red',
                            },
                        }}
                    />
                </Stack>
            </CardContent>
        </Card>
    );
}