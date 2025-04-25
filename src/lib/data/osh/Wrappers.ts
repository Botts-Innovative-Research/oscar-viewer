/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// @ts-ignore
import ConSysApi from "osh-js/source/core/datasource/ConSysApi/ConSysApi.datasource";

export interface IConSysApiWrapper {
    ConSysApi: ConSysApi,
    datastreamId: string
}

export class ConSysApiWrapper implements IConSysApiWrapper {
    ConSysApi: ConSysApi;
    datastreamId: string;

    constructor(ConSysApi: ConSysApi, datastreamId: string) {
        this.ConSysApi = ConSysApi;
        this.datastreamId = datastreamId;
    }
}
