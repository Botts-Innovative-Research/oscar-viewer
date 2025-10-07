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
                    "reportType": this.reportType,
                    "startDateTime": this.startDateTime,
                    "endDateTime": this.endDateTime,
                    "laneUID": this.laneUID,
                    "eventType": this.eventId
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

export function generateCommandJSON(startDateTime: string, endDateTime: string, reportType: string, laneUID: string, eventType: string) {
    return JSON.stringify({
        "params": {
            "reportType": reportType,
            "startDateTime": startDateTime,
            "endDateTime": endDateTime,
            "laneUID": laneUID,
            "eventType": eventType
        }
    })
}
