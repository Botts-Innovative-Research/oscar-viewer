/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IEventTableData} from "../../../../types/new-types";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {warn} from "next/dist/build/output/log";
import System from "osh-js/source/core/sweapi/system/System.js";

export class EventTableData implements IEventTableData {
    id: number;
    secondaryInspection?: boolean;
    laneId: string;
    occupancyId: string;
    startTime: string;
    endTime: string;
    maxGamma?: number;
    maxNeutron?: number;
    neutronBackground?: number;
    pillarOccupancy?: number;
    status: string;
    adjudicatedUser?: string;
    adjudicatedCode?: number;
    adjudicatedData?: AdjudicationData;
    systemIdx?: string;

    constructor(id: number, laneId: string, msgValue: any, adjudicatedData: AdjudicationData | null = null) {
        this.id = id;
        this.laneId = laneId
        this.occupancyId = msgValue.occupancyCount;
        this.startTime = msgValue.startTime;
        this.endTime = msgValue.endTime;
        this.maxGamma = msgValue.maxGamma > -1 ? msgValue.maxGamma : null;
        this.maxNeutron = msgValue.maxNeutron > -1 ? msgValue.maxNeutron : null;
        this.neutronBackground = msgValue.neutronBackground > -1 ? msgValue.neutronBackground : null;
        this.pillarOccupancy = msgValue.occupancyCount > -1 ? msgValue.occupancyCount : null;
        if (msgValue.gammaAlarm && msgValue.neutronAlarm) {
            this.status = "Gamma & Neutron";
        } else if (msgValue.gammaAlarm) {
            this.status = "Gamma";
        } else if (msgValue.neutronAlarm) {
            this.status = "Neutron";
        }
        else{
            console.warn("No alarm detected for event: ", msgValue);
            return null;
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

    setSystemIdx(systemIdx: string) {
        this.systemIdx = systemIdx;
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

    sendAdjudicationToServer() {

    }
}