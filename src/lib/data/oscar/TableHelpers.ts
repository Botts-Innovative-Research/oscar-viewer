/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IAlarmTableData, IEventTableData, INationalTableData} from "../../../../types/new-types";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";


export class EventTableData implements IEventTableData {
    id: number;
    secondaryInspection?: string;
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
    systemIdx?: string; //rpm system id
    dataStreamId?: string;
    observationId: string;
    isAdjudicated: boolean;
    foiId: string;

    constructor(id: number, laneId: string, msgValue: any, observationId: string, foiId: string,  adjudicatedData: AdjudicationData | null = null) {
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
        } else {
            this.status = "None"
        }
        this.adjudicatedData = adjudicatedData ? adjudicatedData : new AdjudicationData("N/A", "N/A", "N/A", "N/A");
        this.isAdjudicated = msgValue.isAdjudicated;
        this.observationId = observationId;
        this.secondaryInspection = msgValue.secondaryInspection;
        this.foiId = foiId;
    }

    setAdjudicationData(aData: AdjudicationData) {
        this.adjudicatedData = aData;
    }

    // addSecondaryInspection(aDataSecondary: AdjudicationData) {
    //     this.secondaryInspection = true;
    //     this.adjudicatedData.secondaryInspectionStatus = true
    // }

    setSecondaryInspection(inspection: string){
        this.secondaryInspection = inspection
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

    setDataStreamId(dataStreamId: string) {
        if (!dataStreamId) {
            let error = new Error()
            console.error("Datastream undefined, cannot set dsID", error.stack)
        }
        this.dataStreamId = dataStreamId;
    }

    setFoiId(foiId: string) {
        this.foiId = foiId;
    }

    setObservationId(id: string) {
        this.observationId = id;
    }

    private hashEntry(){
        // let sTHex = this.startTime.toString(16);

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
        if (order === "ascending") {
            this.data.sort((a, b) => {
                return a.getStartTimeNum() - b.getStartTimeNum();
            });
        } else if (order === "descending") {
            this.data.sort((a, b) => {
                return b.getStartTimeNum() - a.getStartTimeNum();
            });
        } else {
            console.log("Invalid ordering provided");
        }
    }

    sortByEndTime(order: string) {
        if (order === "ascending") {
            this.data.sort((a, b) => {
                return a.getEndTimeNum() - b.getEndTimeNum();
            });
        } else if (order === "descending") {
            this.data.sort((a, b) => {
                return b.getEndTimeNum() - a.getEndTimeNum();
            });
        } else {
            console.log("Invalid ordering provided");
        }
    }

    sortByLaneId(order: string) {
        if (order === "ascending") {
            this.data.sort((a, b) => {
                return a.laneId.localeCompare(b.laneId);
            });
        } else if (order === "descending") {
            this.data.sort((a, b) => {
                return b.laneId.localeCompare(a.laneId);
            });
        } else {
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
        this.neutronAlarmCount = neutronCount;
        this.faultAlarmCount = faultCount;
        this.tamperAlarmCount = tamperCount;
    }
}

export class NationalTableDataCollection {
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



export class AlarmTableData implements IAlarmTableData {
    id: number; // Unique ID for event
    laneId: string;
    // count1: number;
    // count2: number;
    // count3: number;
    // count4: number;
    status: string;
    timestamp: string;


    constructor(id: number, laneId: string,  status: string, timestamp: string) {
    // constructor(id: number, laneId: string, count1: number, count2: number, count3: number, count4: number, status: string, timestamp: string) {
        this.id = id;
        this.laneId = laneId;
        // this.count1 = count1;
        // this.count2 = count2;
        // this.count3 = count3;
        // this.count4 = count4;
        this.status = status;
        this.timestamp = timestamp;
    }
}

export class AlarmTableDataCollection {
    data: AlarmTableData[];

    constructor() {
        this.data = [];
    }

    setData(data: AlarmTableData[]) {
        this.data = data;
    }

    addData(data: AlarmTableData) {
        this.data.push(data);
    }


}
