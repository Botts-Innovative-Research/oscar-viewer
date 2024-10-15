/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IEventTableData, INationalTableData} from "../../../../types/new-types";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {warn} from "next/dist/build/output/log";
import System from "osh-js/source/core/sweapi/system/System.js";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";

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
    adjudicatedData: AdjudicationData;
    systemIdx?: string;
    dataStreamId?: string;
    observationId: string;

    constructor(id: number, laneId: string, msgValue: any, adjudicatedData: AdjudicationData | null = null) {
        this.id = id
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
            this.status= "None"
            // console.warn("No alarm detected for event: ", msgValue);
            // return null;
        }
        this.adjudicatedData = adjudicatedData ? adjudicatedData: new AdjudicationData({
            time: "",
            id: "",
            username: "",
            feedback:"",
            adjudicationCode: AdjudicationCodes.getCodeObjByIndex(0),
            isotopes: "",
            secondaryInspectionStatus: "",
            filePaths: "",
            occupancyId: msgValue.occupancyId,
            alarmingSystemUid: ""
        });
    }

    addAdjudicationData(aData: AdjudicationData) {
        this.adjudicatedData = aData;
    }

    // addSecondaryInspection(aDataSecondary: AdjudicationData) {
    //     this.secondaryInspection = true;
    //     this.adjudicatedData.secondaryInspectionStatus = true
    // }

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

    setDataStreamId(dataStreamId: string){
        if(!dataStreamId){
            let error = new Error()
            console.error("Datastream undefined, cannot set dsID", error.stack)
        }
        this.dataStreamId = dataStreamId;
    }
    setObservationId(id: string){
        this.observationId = id;
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
        return this.data.filter((data) => data.adjudicatedData.getCodeValue() === code);
    }
}


export class NationalTableData implements INationalTableData {
    id: number;
    site: string;
    occupancyCount: number;
    gammaAlarmCount: number;
    neutronAlarmCount: number;
    faultAlarmCount: number;
    tamperAlarmCount: number;

    constructor(id: number, siteName: string, occupancyCount: number, gammaCount: number, neutronCount: number, faultCount: number, tamperCount: number) {
        this.id = id;
        this.site = siteName;
        this.occupancyCount = occupancyCount;
        this.gammaAlarmCount = gammaCount;
        this.neutronAlarmCount= neutronCount;
        this.faultAlarmCount= faultCount;
        this.tamperAlarmCount = tamperCount;
    }
}

export class NationalTableDataCollection{
    data: NationalTableData[];
    constructor() {
        this.data = [];
    }

    setData(data: NationalTableData[]) {
        this.data = data;
    }

    addData(data: NationalTableData) {
        this.data.push(data);
    }


}
