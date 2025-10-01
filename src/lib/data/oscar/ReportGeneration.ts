import {INode} from "@/lib/data/osh/Node";

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
                "params": {
                    "startDateTime": this.startDateTime,
                    "endDateTime": this.endDateTime,
                    "reportType": this.reportType,
                    "laneUID": this.laneUID,
                    "eventId": this.eventId
                }
            })
    }
}


export async function sendReportCommand(node: INode, controlStreamId: string, command: ReportGenerationCommand | string) {
    console.log("[Report Generation] Report Body:", command);
    let ep = node.getConnectedSystemsEndpoint(false) + `/controlstreams/${controlStreamId}/commands`
    let response = await fetch(ep, {
        method: "POST",
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: command instanceof ReportGenerationCommand ? command.getJsonString() : command
    })
    return response;
}

export function generateCommandJSON(startDateTime: string, endDateTime: string, reportType: string, laneUID: string[], eventType: string) {
    return JSON.stringify({
        "params": {
            "startDateTime": startDateTime,
            "endDateTime": endDateTime,
            "reportType": reportType,
            "laneUID": laneUID,
            "eventType": eventType
        }
    })
}
