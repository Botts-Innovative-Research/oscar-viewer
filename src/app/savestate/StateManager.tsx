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
    Container,
    Stack,
    TextField, Typography
} from "@mui/material";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice, selectDefaultNode, setNodes} from "@/lib/state/OSHSlice";
import {useCallback, useEffect, useState} from "react";
import {IOSCARClientState, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {Node, NodeOptions} from "@/lib/data/osh/Node";
import Divider from "@mui/material/Divider";
import {white} from "next/dist/lib/picocolors";


export default function StateManager() {
    const dispatch = useAppDispatch();
    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshSlice);
    const oscarSlice: IOSCARClientState = useSelector((state: RootState) => state.oscarClientSlice);
    const defaultNode = useSelector(selectDefaultNode);
    const [cfgDSId, setCfgDSId] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("config");
    const newNodeOpts: NodeOptions = {
        name: "New Node",
        address: "localhost",
        port: 0,
        oshPathRoot: "/sensorhub",
        sosEndpoint: "/sos",
        csAPIEndpoint: "/api",
        csAPIConfigEndpoint: "/configs",
        auth: {username: "", password: ""},
        isSecure: false,
        isDefaultNode: false
    };
    const [loadNodeOpts, setLoadNodeOpts] = useState<NodeOptions>(newNodeOpts);
    const [targetNode, setTargetNode] = useState<Node>(new Node(newNodeOpts));
    const [showLoadAlert, setShowLoadAlert] = useState<boolean>(false);

    useEffect(() => {
        setLoadNodeOpts({...loadNodeOpts, ...defaultNode});
    }, []);

    const getCFGDataStream = useCallback(async () => {
        if (defaultNode) {
            console.log("Default Node: ", defaultNode);
            let cfgSystem = await OSHSliceWriterReader.checkForConfigSystem(defaultNode);
            if (cfgSystem) {
                let dsId = await OSHSliceWriterReader.checkForConfigDatastream(defaultNode, cfgSystem);
                setCfgDSId(dsId);
                return dsId;
            }
        }
    }, [defaultNode]);

    const handleSaveState = async () => {
        let dsID = await getCFGDataStream();
        if (cfgDSId === null) {
            let obs = OSHSliceWriterReader.writeConfigToString({oscarData: oscarSlice, oshData: oshSlice}, fileName);
            console.log(obs);
            let resp = await OSHSliceWriterReader.sendBlobToServer(defaultNode, dsID, obs);
            console.log(resp);
        }
    }

    const handleLoadState = async () => {
        toggleLoadAlert();
        let responseJSON = await OSHSliceWriterReader.retrieveLatestConfig(targetNode);
        if (responseJSON) {
            console.log("Config data retrieved: ", responseJSON);
            let cfgData = responseJSON.result.filedata;
            let cfgJSON = JSON.parse(cfgData);
            console.log("Config data parsed: ", cfgJSON);

            dispatch(setCurrentUser(cfgJSON.user.currentUser));

            let nodes = cfgJSON.nodes.map((opt: NodeOptions) => new Node(opt));
            dispatch(setNodes(nodes));
        }
    }

    const handleChangeForm = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        if (name === "File Name") {
            setFileName(value);
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

    useEffect(() => {
        setTargetNode(new Node(loadNodeOpts));
    }, [loadNodeOpts]);

    return (
        <Container sx={{margin: 2, padding: 2, width: '100%'}}>
            <CardHeader title={"Configuration Management"} titleTypographyProps={{variant: "h2"}}/>
            <Box component="form" sx={{margin: 2}}>
                <Stack spacing={3} divider={<Divider orientation={"vertical"} flexItem/>} direction="column">

                    <Card variant={"outlined"}>
                        <CardHeader title={"Save Config Options"}/>
                        <CardContent>
                            <Stack spacing={2}>

                                <TextField label="File Name" value={fileName} onChange={handleChangeForm}/>
                                <Button onClick={handleSaveState} variant={"contained"} color={"primary"}>
                                    Save
                                </Button>
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
                                <TextField label="Server Endpoint" name="sosEndpoint" value={loadNodeOpts.oshPathRoot}
                                           onChange={handleChangeLoadForm}/>
                                <TextField label="API Endpoint" name="csAPIEndpoint" value={loadNodeOpts.csAPIEndpoint}
                                           onChange={handleChangeLoadForm}/>
                                <TextField label="Server Username" name="username" value={loadNodeOpts.auth.username}
                                           onChange={handleChangeLoadForm}/>
                                <TextField label="Server Password" name="password" value={loadNodeOpts.auth.password}
                                           onChange={handleChangeLoadForm} type={"password"}/>

                                <Button onClick={toggleLoadAlert} variant={"contained"} color={"primary"}>
                                    Load State
                                </Button>
                                {showLoadAlert && (
                                    <Alert severity={"warning"} variant={"filled"}>
                                        <AlertTitle>Warning</AlertTitle>
                                        <Container>
                                            <Stack spacing={2} direction={"row"}>
                                                <Typography>
                                                    Loading Config will overwrite the current configuration.
                                                </Typography>
                                                <Button variant={"contained"} color={"success"}
                                                        onClick={handleLoadState}>
                                                    Accept
                                                </Button>
                                            </Stack>
                                        </Container>
                                    </Alert>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>
        </Container>
    );
}
