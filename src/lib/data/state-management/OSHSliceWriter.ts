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
        const blob = new Blob([JSON.stringify(slice)], {type: 'application/json'});
        return blob;
    }

    async sendBlobToServer(blob: Blob){
        const formData = new FormData();
        formData.append('file', blob);
        const response = await fetch(this.destinationURL, {
            method: 'POST',
            body: formData
        });
        return response;
    }
}
