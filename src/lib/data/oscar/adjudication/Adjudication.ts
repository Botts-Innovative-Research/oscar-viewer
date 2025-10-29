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
    isotopes: string[]
    secondaryInspectionStatus: string
    filePaths: string[]
    occupancyObsId: string,
    occupancyCount: string,
    alarmingSystemUid: string,
    vehicleId?: string
}


export default class AdjudicationData implements IAdjudicationData {
    time: string;
    id: string;
    feedback: string
    adjudicationCode: AdjudicationCode
    isotopes: string[]
    secondaryInspectionStatus: string
    // secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED"
    filePaths: string[]
    occupancyObsId: string // observation ID
    alarmingSystemUid: string
    vehicleId?: string
    username: string
    occupancyCount: string;

    constructor(time: string, occupancyCount: string, occupancyObsId: string, alarmingSystemUid: string) {
        this.time = time;
        this.alarmingSystemUid = alarmingSystemUid;
        this.adjudicationCode = AdjudicationCodes.getCodeObjByIndex(0);
        this.secondaryInspectionStatus = "NONE";
        this.occupancyObsId = occupancyObsId
        this.id = randomUUID();
        this.feedback= '';
        this.isotopes= [];
        this.filePaths = [];
        this.username = '';
        this.occupancyCount = occupancyCount;
    }


    setUser(user: string) {
        this.username = user;
    }

    setTime(isoTime: string) {
        this.time = isoTime;
    }

    setFeedback(feedback: string) {
        this.feedback = feedback;
    }

    setIsotopes(isotopes: string[]) {
        this.isotopes = isotopes;
    }

    setSecondaryInspectionStatus(secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED" | "") {
        this.secondaryInspectionStatus = secondaryInspectionStatus;
    }

    setFilePaths(filePaths: string[]) {
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
