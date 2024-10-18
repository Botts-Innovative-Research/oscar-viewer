import {randomUUID} from "osh-js/source/core/utils/Utils";
import {INode, Node} from "@/lib/data/osh/Node";
import {AdjudicationCode, AdjudicationCodes} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";


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
    secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED"
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string
    vehicleId?: string

    // constructor(properties: IAdjudicationData) {
    //     Object.assign(this, properties);
    //     this.id = randomUUID();
    // }

    constructor(username: string, occupancyId: string, alarmingSystemUid: string) {
        this.username = username;
        this.occupancyId = occupancyId;
        this.alarmingSystemUid = alarmingSystemUid;
        this.adjudicationCode = AdjudicationCodes.getCodeObjByIndex(0);
        this.secondaryInspectionStatus = "NONE";
        this.id = randomUUID();
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

    setSecondaryInspectionStatus(secondaryInspectionStatus: "NONE" | "REQUESTED" | "COMPLETED") {
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

    createAdjudicationObservation(): any {
        // this method needs to validate the data beforehand
        console.log("Creating adjudication observation:", this)
        let obs = {
            "phenomenonTime": this.time,
            "result": {
                "username": this.username,
                "feedback": this.feedback,
                "adjudicationCode": this.adjudicationCode.label,
                "isotopes": this.isotopes ? this.isotopes : "",
                "secondaryInspectionStatus": this.secondaryInspectionStatus,
                "filePaths": this.filePaths? this.filePaths : "",
                "occupancyId": this.occupancyId,
                "alarmingSystemUid": this.alarmingSystemUid,
                "vehicleId": this.vehicleId ? this.vehicleId : ""
            }
        }
        // return obs
        let jsonString: string = JSON.stringify(obs, ['phenomenonTime', 'result', 'username', 'feedback', 'adjudicationCode', 'isotopes',
            'secondaryInspectionStatus', 'filePaths', 'occupancyId', 'alarmingSystemUid', 'vehicleId'], 2);
        console.log("Created ADJ String Representation", jsonString);
        return jsonString
    }
}

export class AdjudicationCommand {
    setAdjudicated: boolean;
    observationId: string;

    constructor(obsId: string, setAdjudicated: true) {
        this.observationId = obsId;
        this.setAdjudicated = setAdjudicated;
    }

    getJsonString() {
        return JSON.stringify(
            {
                "params": {
                    'observationId': this.observationId,
                    'setAdjudicated': this.setAdjudicated
                }
            })
    }
}

export function createAdjudicationObservation(data: IAdjudicationData, resultTime: string): any {
    console.log("Creating adjudication observation:", data)
    let obs = {
        "phenomenonTime": resultTime,
        "result": {
            // "time": new Date(resultTime).getTime(),
            // "id": data.id,
            "username": data.username,
            "feedback": data.feedback,
            "adjudicationCode": data.adjudicationCode,
            "isotopes": data.isotopes,
            "secondaryInspectionStatus": data.secondaryInspectionStatus,
            "filePaths": data.filePaths,
            "occupancyId": data.occupancyId,
            "alarmingSystemUid": data.alarmingSystemUid,
            "vehicleId": data.vehicleId ? data.vehicleId : ""
        }
    }
    // return obs
    return JSON.stringify(obs, ['phenomenonTime', 'result', 'time', 'id', 'username', 'feedback', 'adjudicationCode', 'isotopes', 'secondaryInspectionStatus', 'filePaths', 'occupancyId', 'alarmingSystemUid', 'vehicleId'], 2);
}

export async function sendSetAdjudicatedCommand(node: INode, controlStreamId: string, command: AdjudicationCommand | string) {
    let ep = node.getConnectedSystemsEndpoint(false) + `/controlstreams/${controlStreamId}/commands`
    let response = await fetch(ep, {
        method: "POST",
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: command instanceof AdjudicationCommand ? command.getJsonString() : command
    })
    if (response.ok) {
        let json = await response.json();
        console.log("ADJ Command Response", json)
    } else {
        console.warn("[ADJ] adj command failed", response)
    }
}

export function generateCommandJSON(observationId: string, setAdjudicated: boolean) {
    return JSON.stringify({
        "params": {
            'observationId': observationId,
            'setAdjudicated': setAdjudicated
        }
    })
}

export async function findObservationIdBySamplingTime(node: INode, datastreamId: string, samplingTime: string) {
    let ep = node.getConnectedSystemsEndpoint(false) + `/datastreams/${datastreamId}/observations?` + `resultTime=${samplingTime}`;
    let response = await fetch(ep, {
        method: 'GET',
        headers: {
            ...node.getBasicAuthHeader(),
            'Content-Type': 'sml+json'
        },
        mode: "cors"
    })
    if (response.ok) {
        // Yes, this IS a sketchy way to do this. Working on a change to Tables that is an actual fix
        let json = await response.json()
        console.log("Observations Found", json)
        return json.items[0]
    } else {
        console.log("Response Failed", response)
        return false
    }
}
