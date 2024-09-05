/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import { pink } from "@mui/material/colors";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {GammaScanData, NeutronScanData, SweApiMessage} from "types/message-types";

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
}

export class LiveLane {
    lane: LaneMeta;
    latestGammaScanMessage: GammaScanData | null = null;
    latestNeutronScanMessage: NeutronScanData | null = null;

    constructor(lane: LaneMeta) {
        this.lane = lane;
   }

    connectNeutronScan(datasource: typeof SweApi) {
        datasource.connect();
        datasource.subscribe((message: SweApiMessage) => {
            const neutronScanData = message.values[0].data as NeutronScanData;
            this.latestNeutronScanMessage = neutronScanData;
            console.info("Updated neutron message: " + neutronScanData);
        });
    }

    connectGammaScan(datasource: typeof SweApi) {
        datasource.connect();
        datasource.subscribe((message: SweApiMessage) => {
            const gammaScanData = message.values[0].data as GammaScanData;
            this.latestGammaScanMessage = gammaScanData;
            console.info("Updated gamma message: " + gammaScanData);
        });
    }

    getLatestGammaScan() {
        return this.latestGammaScanMessage;
    }

    getLatestNeutronScan() {
        return this.latestNeutronScanMessage;
    }
}
