import {INode} from "@/lib/data/osh/Node";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

export interface IReportGeneration {
    time: string,
    id: string;

}


export default class ReportGenerationData implements IReportGeneration {
    time: string;
    id: string;

    constructor(time: string) {
        this.time = time;

    }


    setTime(isoTime: string) {
        this.time = isoTime;
    }



    createReportObservation(): any {
        // this method needs to validate the data beforehand
        console.log("Creating report observation:", this)
        let obs = {
            "phenomenonTime": this.time,
            "result": {

            }
        }
        // return obs
        let jsonString: string = JSON.stringify(obs, ['phenomenonTime', 'result'], 2);
        console.log("Created Report String Representation", jsonString);
        return jsonString
    }
}

export class ReportGenerationCommand {
    observationId: string;

    constructor(obsId: string) {
        this.observationId = obsId;
    }

    getJsonString() {
        return JSON.stringify(
            {
                "params": {
                    'observationId': this.observationId,
                }
            })
    }
}

export function createReportObservation(data: IReportGeneration, resultTime: string): any {
    console.log("[Report Generation] Creating report observation:", data)
    let obs = {
        "phenomenonTime": resultTime,
        "result": {
            "time": new Date(resultTime).getTime(),
            // "id": data.id,

        }
    }
    // return obs
    return JSON.stringify(obs, ['phenomenonTime', 'result', 'time', 'id'], 2);
}

export async function sendSetReportCommand(node: INode, controlStreamId: string, command: ReportGenerationCommand | string) {
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
    if (response.ok) {
        let json = await response.json();
        console.log("[Report Generation] Command Response", json)


    } else {
        console.warn("[Report Generation] report command failed", response)
    }
}

export function generateCommandJSON(observationId: string) {
    return JSON.stringify({
        "params": {
            'observationId': observationId,
        }
    })
}

export async function fetchOccupancyObservation(ds: typeof DataStream, startTime: any, endTime: any){
    let initialRes = await ds.searchObservations(new ObservationFilter({resultTime: `${startTime}/${endTime}`}), 1)

    const obsCollection = await initialRes.nextPage();
    console.log("[Report Generation] obsCollection", obsCollection)

    return obsCollection
}