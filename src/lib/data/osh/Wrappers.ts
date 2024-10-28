/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

export interface ISweAPIWrapper {
    sweApi: SweApi,
    datastreamId: string
}

export class SweAPIWrapper implements ISweAPIWrapper {
    sweApi: SweApi;
    datastreamId: string;

    constructor(sweApi: SweApi, datastreamId: string) {
        this.sweApi = sweApi;
        this.datastreamId = datastreamId;
    }
}
