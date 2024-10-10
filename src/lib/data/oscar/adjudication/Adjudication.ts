import {randomUUID} from "osh-js/source/core/utils/Utils";

export interface IAdjudicationData {
    time: string,
    id: string;
    username: string
    feedback: string
    adjudicationCode: string
    isotopes: string
    secondaryInspectionStatus: string
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string,
    vehicleId?: string
}

export default class AdjudicationData {
    id: string;
    username: string
    feedback: string
    adjudicationCode: string
    isotopes: string
    secondaryInspectionStatus: string
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string
    vehicleId?: string

    constructor(properties: IAdjudicationData) {
        Object.assign(this, properties);
        this.id = randomUUID();
    }
}

export function createAdjudicationObservation(data: IAdjudicationData, resultTime: string): any {
    let obs =  {
        "phenomenonTime": resultTime,
        "result": {
            "time": new Date(resultTime).getTime(),
            // "id": data.id,
            "username": data.username,
            "feedback": data.feedback,
            "adjudicationCode": data.adjudicationCode,
            "isotopes": data.isotopes,
            "secondaryInspectionStatus": data.secondaryInspectionStatus,
            "filePaths": data.filePaths,
            "occupancyId": data.occupancyId,
            "alarmingSystemUid": data.alarmingSystemUid
        }
    }
    // return obs
    return JSON.stringify(obs, ['phenomenonTime', 'result', 'time', 'id', 'username', 'feedback', 'adjudicationCode', 'isotopes', 'secondaryInspectionStatus', 'filePaths', 'occupancyId', 'alarmingSystemUid'], 2);

}
