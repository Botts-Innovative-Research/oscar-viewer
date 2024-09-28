/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Box, Button} from "@mui/material";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice, selectDefaultNode} from "@/lib/state/OSHSlice";
import {useEffect} from "react";


export default function TestStateWriter() {

    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshSlice);
    const defaultNode = useSelector(selectDefaultNode);

    useEffect(() => {
        if (defaultNode) {
            console.log("Default Node: ", defaultNode);
            OSHSliceWriterReader.checkForConfigSystem(defaultNode);
        }
    }, [defaultNode]);

    const handleSaveState = async () => {

        let writer = new OSHSliceWriterReader("http://192.168.1.158:8782/sensorhub/configs/datastreams/ko62rfqbgs5cs/observations");
        let obs = writer.writeSliceToString(oshSlice);
        console.log(obs);
        let resp = await writer.sendBlobToServer(obs);
        console.log(resp);
    }

    return (
        <Box>
            <h1>Save Current State!</h1>
            <Button onClick={handleSaveState}>
                Save
            </Button>
        </Box>
    );
}
