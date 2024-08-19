/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {Box, Button} from "@mui/material";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import {RootState} from "@/lib/state/Store";
import {useSelector} from "react-redux";
import {IOSHSlice} from "@/lib/state/OSHSlice";



export default function TestStateWriter() {
    // access the state
    const oshSlice: IOSHSlice = useSelector((state: RootState) => state.oshState);

    function blobToString(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = reject;
            reader.readAsText(blob);
        });
    }

    const handleSaveState = async () => {
        // call OSHSliceWriter.writeSliceToBlob
        let writer = new OSHSliceWriterReader("http://192.168.1.158:8782/sensorhub/configs/datastreams/ko62rfqbgs5cs/observations");
        // let blob = writer.writeSliceToBlob(oshSlice);
        let obs = writer.writeSliceToString(oshSlice);
        console.log(obs);
        // let blobString;
        // try {
        //     blobString = await blobToString(blob);
        //     console.log(blobString);
        // } catch (error) {
        //     console.error("Error converting blob to string:", error);
        // }
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
