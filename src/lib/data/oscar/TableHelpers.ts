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

        this.occupancyId = msgValue.occupancyCount;
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
        this.adjudicatedData.addSecondary(aDataSecondary)
    }

    // comparators
    getStartTimeNum(): number {
        return new Date(this.startTime).getTime();
    }

    getEndTimeNum(): number {
        return new Date(this.endTime).getTime();
    }
}

export class EventTableDataCollection {
    data: EventTableData[];
    sortedBy: string = "unsorted";

    constructor() {
        this.data = [];
    }

    setData(data: EventTableData[]) {
        this.data = data;
    }

    addData(data: EventTableData) {
        this.data.push(data);
    }

    sortByStartTime(order: string) {
        if(order === "ascending"){
            this.data.sort((a, b) => {
                return a.getStartTimeNum() - b.getStartTimeNum();
            });
        }else if(order === "descending"){
            this.data.sort((a, b) => {
                return b.getStartTimeNum() - a.getStartTimeNum();
            });
        }else{
            console.log("Invalid ordering provided");
        }
    }

    sortByEndTime(order: string) {
        if(order === "ascending"){
            this.data.sort((a, b) => {
                return a.getEndTimeNum() - b.getEndTimeNum();
            });
        }else if(order === "descending"){
            this.data.sort((a, b) => {
                return b.getEndTimeNum() - a.getEndTimeNum();
            });
        }else{
            console.log("Invalid ordering provided");
        }
    }

    sortByLaneId(order: string) {
        if(order === "ascending"){
            this.data.sort((a, b) => {
                return a.laneId.localeCompare(b.laneId);
            });
        }else if(order === "descending"){
            this.data.sort((a, b) => {
                return b.laneId.localeCompare(a.laneId);
            });
        }else{
            console.log("Invalid ordering provided");
        }
    }

    getExcludingAdjudicated() {
        return this.data.filter((data) => data.adjudicatedData === null);
    }

    getFilteredByAdjudicatedCode(code: number) {
        return this.data.filter((data) => data.adjudicatedData.code === code);
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