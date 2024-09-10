/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IEventTableData} from "../../../../types/new-types";
import {randomUUID} from "osh-js/source/core/utils/Utils";

export class EventTableData implements IEventTableData {
    id: number;
    secondaryInspection?: boolean;
    laneId: string;
    occupancyId: string;
    startTime: string;
    endTime: string;
    maxGamma?: number;
    maxNeutron?: number;
    status: string;
    adjudicatedUser?: string;
    adjudicatedCode?: number;
    adjudicatedData?: AdjudicationData;

    constructor(id: number, laneId: string, msgValue: any, adjudicatedData: AdjudicationData | null = null) {
        this.id = id;
        this.laneId = laneId

        if (msgValue) {
            console.log("Adding msgValue: ", msgValue)
        } else {
            try {
                throw new Error("No msgValue provided");
            } catch (e) {
                console.log(e);
            }
        }

        this.occupancyId = msgValue.occupancyId;
        this.startTime = msgValue.startTime;
        this.endTime = msgValue.endTime;
        this.maxGamma = msgValue.maxGamma ? msgValue.maxGamma : null;
        this.maxNeutron = msgValue.maxNeutron ? msgValue.maxNeutron : null;
        if (this.maxGamma && this.maxNeutron) {
            this.status = "Gamma & Neutron";
        } else if (this.maxGamma) {
            this.status = "Gamma";
        } else if (this.maxNeutron) {
            this.status = "Neutron";
        }
        this.adjudicatedUser = adjudicatedData ? adjudicatedData.user : null;
        this.adjudicatedCode = adjudicatedData ? adjudicatedData.code : null;
        this.adjudicatedData = adjudicatedData;
    }

    addAdjudicationData(aData: AdjudicationData) {
        this.adjudicatedData = aData;
        this.adjudicatedUser = aData.user;
        this.adjudicatedCode = aData.code;
    }

    addSecondaryInspection(aDataSecondary: AdjudicationData) {
        this.secondaryInspection = true;
        this.adjudicatedData.addSecondary()
    }
}

export class AdjudicationData {
    id: string;
    user: string;
    code: number;
    secondary?: Map<string, AdjudicationData>;

    constructor(user: string, code: number) {
        this.id = "adjudication" + randomUUID();
        this.user = user;
        this.code = code;
    }

    updateCode(code: number) {
        this.code = code;
    }

    addSecondary(aData: AdjudicationData) {
        this.secondary.set(aData.id, aData);
    }

    removeSecondary(aData: AdjudicationData) {
        this.secondary.delete(aData.id);
    }
}
