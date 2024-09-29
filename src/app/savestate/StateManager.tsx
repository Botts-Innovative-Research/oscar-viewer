/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Box, Button, Card, TextField} from "@mui/material";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice, selectDefaultNode, setNodes} from "@/lib/state/OSHSlice";
import {useCallback, useState} from "react";
import {IOSCARClientState, setCurrentUser} from "@/lib/state/OSCARClientSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import {NodeOptions, Node} from "@/lib/data/osh/Node";


export default function StateManager() {
    const dispatch = useAppDispatch();
    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshSlice);
    const oscarSlice: IOSCARClientState = useSelector((state: RootState) => state.oscarClientSlice);
    const defaultNode = useSelector(selectDefaultNode);
    const [cfgDSId, setCfgDSId] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("config");

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
        let responseJSON = await OSHSliceWriterReader.retrieveLatestConfig(defaultNode);
        if(responseJSON) {
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

    return (
        <Card sx={{margin: 2, width: '100%'}}>
            <Box component="form" sx={{margin: 2}}>
                <h1>Save Current State!</h1>
                <TextField label="File Name" value={fileName} onChange={handleChangeForm}/>

                <Button onClick={handleSaveState}>
                    Save
                </Button>

                <Button onClick={handleLoadState}>
                    Load State
                </Button>
            </Box>
        </Card>
    );
}
