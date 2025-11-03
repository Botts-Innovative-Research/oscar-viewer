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
    occupancyObsId: string; // observation ID
    occupancyCount: string; // occupancy count in result
    startTime: string;
    endTime: string;
    maxGamma?: number;
    maxNeutron?: number;
    neutronBackground?: number;
    pillarOccupancy?: number;
    status: string;
    adjudicatedData: AdjudicationData;
    laneSystemId?: string; // lane system id
    rpmSystemId?: string; // rpm id
    dataStreamId?: string;
    foiId: string;
    videoPaths: string[];
    adjudicatedIds: string[];

    constructor(id: number, laneId: string, msgValue: any, occupancyObsId: string, foiId: string,  adjudicatedData: AdjudicationData | null = null) {

        this.id = id
        this.laneId = laneId
        this.occupancyCount = msgValue.occupancyCount;
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
        this.occupancyObsId = occupancyObsId;
        this.foiId = foiId;
        this.videoPaths = msgValue.videoPaths;
        this.adjudicatedIds = msgValue.adjudicatedIds;
        this.secondaryInspection = this.setSecondaryStatus(msgValue.adjudicatedIds); //TODO: reference adjudicatedIds to get secondary status
    }

    adjudicatedUser?: string;
    adjudicatedCode?: number;

    setAdjudicationData(aData: AdjudicationData) {
        this.adjudicatedData = aData;
    }

    // addSecondaryInspection(aDataSecondary: AdjudicationData) {
    //     // this.secondaryInspection = true;
    //     // this.adjudicatedData.secondaryInspectionStatus = true;
    //     this.secondaryInspection = aDataSecondary.secondaryInspectionStatus;
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

    setLaneSystemId(laneSystemId: string) {
        this.laneSystemId = laneSystemId;
    }

    setRPMSystemId(rpmSystemId: string) {
        this.rpmSystemId = rpmSystemId;
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

    setOccupancyObsId(id: string) {
        this.occupancyObsId = id;
    }

    setSecondaryStatus(adjudicatedIds: string[]){
        return "NONE";
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
    numOccupancies: number;
    numGammaAlarms: number;
    numNeutronAlarms: number;
    numGammaNeutronAlarms: number;
    numFaults: number;
    numGammaFaults: number;
    numNeutronFaults: number;
    numTampers: number;

    constructor(id: number, siteName: string, occupancyCount: number, faultCount: number, gammaCount: number, neutronCount: number, gammaFaultCount: number, neutronFaultCount: number, tamperCount: number, gammaNeutronAlarmCount: number) {
        this.id = id;
        this.site = siteName;
        this.numOccupancies = occupancyCount;
        this.numGammaAlarms = gammaCount;
        this.numNeutronAlarms = neutronCount;
        this.numGammaNeutronAlarms = gammaNeutronAlarmCount;
        this.numFaults = faultCount;
        this.numGammaFaults = gammaFaultCount;
        this.numNeutronFaults = neutronFaultCount;
        this.numTampers = tamperCount;
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
    status: string;
    timestamp: string;


    constructor(id: number, laneId: string,  status: string, timestamp: string) {
        this.id = id;
        this.laneId = laneId;
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
