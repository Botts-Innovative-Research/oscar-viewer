import {randomUUID} from "osh-js/source/core/utils/Utils";
import {INode, Node} from "@/lib/data/osh/Node";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

export interface IAdjudicationData {
    time: string,
    id: string;
    username: string
    feedback: string
    adjudicationCode: AdjudicationCode
    isotopes: string
    secondaryInspectionStatus: string
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string,
    vehicleId?: string
}


export default class AdjudicationData implements IAdjudicationData {
    time: string;
    id: string;
    username: string
    feedback: string
    adjudicationCode: AdjudicationCode
    isotopes: string
    secondaryInspectionStatus: string
    // secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED"
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string
    vehicleId?: string

    constructor(username: string, occupancyId: string, alarmingSystemUid: string, time: string) {
        this.time = time;
        this.username = username;
        this.occupancyId = occupancyId;
        this.alarmingSystemUid = alarmingSystemUid;
        this.adjudicationCode = AdjudicationCodes.getCodeObjByIndex(0);
        this.secondaryInspectionStatus = "NONE";
        this.id = randomUUID();
        this.feedback= '';
        this.isotopes= '';
        this.filePaths= '';
    }


    setTime(isoTime: string) {
        this.time = isoTime;
    }

    setFeedback(feedback: string) {
        this.feedback = feedback;
    }

    setIsotopes(isotopes: string) {
        this.isotopes = isotopes;
    }

    setSecondaryInspectionStatus(secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED" | "") {
        this.secondaryInspectionStatus = secondaryInspectionStatus;
    }

    setFilePaths(filePaths: string) {
        this.filePaths = filePaths;
    }

    setAdjudicationCode(adjudicationCode: AdjudicationCode) {
        this.adjudicationCode = adjudicationCode;
    }

    setVehicleId(vehicleId: string){
        this.vehicleId = vehicleId;
    }

    getCodeAsString(): string {
        return this.adjudicationCode.label;
    }

    getCodeValue(): number {
        return this.adjudicationCode.code;
    }
}
