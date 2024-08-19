/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {randomUUID} from "osh-js/source/core/utils/Utils";

class ILaneMeta {
    id: string;
    name: string;
    label: string;
    systemIds: string[];
    hasEML: boolean;
}

export class LaneMeta implements ILaneMeta {
    id: string;
    name: string;
    label: string;
    systemIds: string[];
    hasEML: boolean;

    constructor(name: string, systemIds: string[], hasEML: boolean = false) {
        this.id = "lane" + randomUUID();
        this.name = name;
        this.label = name.replace(" ", "_").toLowerCase();
        this.systemIds = systemIds;
        this.hasEML = hasEML;
    }

    // getDataStreamsOfType(type: string): Datastream[] {
    //     let datastreams: Datastream[] = [];
    //
    //     for (let ds of this.oshSlice.dataStreams) {
    //         if (ds.checkIfInObsProperties(type)) {
    //             datastreams.push(ds);
    //         }
    //     }
    //     return datastreams;
    // }
}
