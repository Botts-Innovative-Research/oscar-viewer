/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IOSHSlice} from "@/lib/state/OSHSlice";

export class OSHSliceWriter{
    destinationURL: string;

    constructor(destinationURL: string){
        this.destinationURL = destinationURL;
    }

    writeSliceToBlob(slice: IOSHSlice){
        let obs: any = {
            "time": Date.now(),
            "filename": "testcfg.json",
            "filedata": JSON.stringify(slice)
        }

        const blob = new Blob([obs], {type: 'application/json'});
        return blob;
    }

    writeSliceToString(slice: IOSHSlice){
        let obs: any = {
            "time": Date.now(),
            "filename": "testcfg.json",
            "filedata": JSON.stringify(slice)
        }

        return JSON.stringify(obs);
    }

    async sendBlobToServer(body: string){
        // const formData = new FormData();
        // formData.append('file', blob);


        const response = await fetch(this.destinationURL, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': 'Basic ' + btoa(`admin:admin`),
                'Content-Type': 'application/swe+json'
            }
        });
        return response;
    }
}
