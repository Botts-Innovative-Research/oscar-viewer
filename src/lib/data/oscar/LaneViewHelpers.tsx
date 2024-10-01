import {ILaneViewData} from "../../../../types/new-types";


export class LaneViewData implements ILaneViewData{
    id: number;
    laneId: string;
    startTime: string;
    endTime: string;


    constructor(id: number, laneId: string, msgValue: any) {
        this.id = id;
        this.laneId = laneId
        this.startTime = msgValue.startTime;
        this.endTime = msgValue.endTime;


    }

}

export class LaneViewTableCollection{
    data: LaneViewData[];

}