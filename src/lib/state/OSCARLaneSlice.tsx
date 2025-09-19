import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {enableMapSet} from "immer";
import storage from "redux-persist/es/storage";
import {persistReducer} from "redux-persist";
import{createTransform} from "redux-persist";

enableMapSet();


export interface IOSCARLaneSlice{
    lanes: LaneMeta[],
    laneMap: Map<string, LaneMapEntry>,
    oscarService: any[]
}

const initialState: IOSCARLaneSlice ={
    lanes: [],
    laneMap: new Map<string, LaneMapEntry>(),
    oscarService: []
}


export const Slice = createSlice({
    name: 'ClientLaneSlice',
    initialState,
    reducers: {
        setLanes: (state, action: PayloadAction<LaneMeta[]>) => {
            state.lanes = action.payload;
        },
        setLaneMap: (state, action: PayloadAction<Map<string, LaneMapEntry>>) => {
            state.laneMap = (action.payload);
        },
        setOscarService: (state, action: PayloadAction<[]>) => {
            state.oscarService = (action.payload);
        },
    }
})


export const {
    setLanes,
    setLaneMap,
    setOscarService

} = Slice.actions;

export const selectLanes = (state: RootState) => state.laneSlice.lanes;
export const selectOscarService = (state: RootState) => state.laneSlice.oscarService;

export const selectLaneByName = (laneName: string) => (state: RootState) => {
    return state.laneSlice.lanes.find((lane: { name: string }) => lane.name === laneName);
}
export const selectLaneMap = (state: RootState) => state.laneSlice.laneMap;

export const selectLaneById = (laneId: string) => (state: RootState) => {
    return state.laneSlice.lanes.find((lane: { id: string }) => lane.id === laneId);
};

export default Slice.reducer;