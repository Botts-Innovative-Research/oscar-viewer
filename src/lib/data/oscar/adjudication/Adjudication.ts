
export interface IAdjudicationData {
    id: string;
    username: string
    feedback: string
    adjudicationCode: string
    isotopes: string
    secondaryInspectionStatus: string
    filePaths: string
    occupancyId: string
    alarmingSystemUid: string
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

    constructor(properties: IAdjudicationData) {
        Object.assign(this, properties);
    }

    /*async insertDataAsResult(): Promise<void>{
        // system id ok
        // verify datastream exists
        // insert observation into datastream
    }

    async verifyDatastreamExists(){

    }

    async verifySystem(parentLaneSystemId: string){
        let laneSys =
    }*/
}
