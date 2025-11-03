import {INode} from "@/lib/data/osh/Node";
import {AdjudicationCode} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";


export async function sendCommand(node: INode, controlStreamId: string, command: any) {
    console.log("[Command Generation] Body:", command);
    let ep = node.getConnectedSystemsEndpoint(false) + `/controlstreams/${controlStreamId}/commands`

    return await fetch(ep, {
        method: "POST",
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: command
    });
}


export class NationalGenerationCommand {
    startDateTime: string;
    endDateTime: string;

    constructor(endDateTime: string, startDateTime: string) {
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
    }

    getJsonString() {
        return JSON.stringify({
            "parameters": {
                "startDateTime": this.startDateTime,
                "endDateTime": this.endDateTime,
            }
        })
    }
}


export function generateNationalCommandJSON(startDateTime: string, endDateTime: string,) {
    return JSON.stringify({
        "parameters": {
            "startDateTime": startDateTime != null ? startDateTime : null,
            "endDateTime": endDateTime != null ? endDateTime : null,
        }
    })
}

export class ReportGenerationCommand {
    startDateTime: string;
    endDateTime: string;
    reportType: string;
    laneUID: string;
    eventId: string;

    constructor(startDateTime: string, endDateTime: string, reportType: string, laneUID: string, eventId: string) {
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.reportType = reportType;
        this.laneUID = laneUID;
        this.eventId = eventId;
    }

    getJsonString() {
        return JSON.stringify({
                "parameters": {
                    "reportType": this.reportType,
                    "startDateTime": this.startDateTime,
                    "endDateTime": this.endDateTime,
                    "laneUID": this.laneUID,
                    "eventType": this.eventId
                }
            })
    }
}

export function generateReportCommandJSON(startDateTime: string, endDateTime: string, reportType: string, laneUID: string, eventType: string) {
    return JSON.stringify({
        "parameters": {
            "reportType": reportType,
            "startDateTime": startDateTime,
            "endDateTime": endDateTime,
            "laneUID": laneUID ?? "NONE",
            "eventType": eventType ?? "NONE"
        }
    })
}

export class AdjudicationCommand {
    feedback: string;
    adjudicationCode: number;
    isotopes: string;
    secondaryInspectionStatus: string;
    isotopesCount: number;
    filePathsCount: number;
    filePaths: string;
    occupancyObsId: string;
    vehicleId: string;


    constructor(feedback: string, adjudicationCode: number, isotopes: string, secondaryInspectionStatus: string, filePaths: string, occupancyObsId: string, vehicleId: string) {
        this.feedback = feedback;
        this.adjudicationCode = adjudicationCode;
        this.isotopes = isotopes;
        this.isotopesCount = isotopes.length;
        this.filePathsCount = filePaths.length;
        this.secondaryInspectionStatus = secondaryInspectionStatus;
        this.filePaths = filePaths;
        this.occupancyObsId = occupancyObsId;
        this.vehicleId = vehicleId;
    }

    getJsonString() {
        return JSON.stringify({
            "parameters": {
                "feedback": this.feedback,
                "adjudicationCode": this.adjudicationCode,
                "isotopesCount": this.isotopesCount,
                "isotopes": this.isotopes,
                "secondaryInspectionStatus": this.secondaryInspectionStatus,
                "filePathCount": this.filePathsCount,
                "filePaths": this.filePaths,
                "occupancyObsId": this.occupancyObsId,
                "vehicleId": this.vehicleId
            }
        })
    }
}

export function generateAdjudicationCommandJSON(feedback: string, adjudicationCode: AdjudicationCode, isotopes: string[], secondaryInspectionStatus: string, filePaths: string[], occupancyObsId: string, vehicleId: string) {

    return JSON.stringify({
        "parameters": {
            "feedback": feedback,
            "adjudicationCode": adjudicationCode.code,
            "isotopesCount": isotopes?.length ?? 0,
            "isotopes": isotopes ?? [],
            "secondaryInspectionStatus": secondaryInspectionStatus,
            "filePathCount": filePaths?.length ?? 0,
            "filePaths": filePaths ?? [],
            "occupancyObsId": occupancyObsId,
            "vehicleId": vehicleId ?? ""
        }
    })
}

export function generateHLSVideoCommandJSON(streamControl: boolean) {
    return JSON.stringify({
        "parameters": {
            "streamControl": streamControl ? "startStream" : "endStream"
        }
    })
}
