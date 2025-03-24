import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";


export interface LaneViewState {
    currentLane: string | null;
    lastLaneStatus: {
        id: number | null;
        name: string | null;
        status: string | null;
    }

}

const initialState: LaneViewState = {
    currentLane: null,
    lastLaneStatus: {
        id: null,
        name: null,
        status: null,
    }
}

export const Slice = createSlice({
    name: 'laneView',
    initialState: initialState,
    reducers: {
        setCurrentLane: (state, action: PayloadAction<string>) =>{
            state.currentLane = action.payload;
        },
        setLastLaneStatus: (state, action: PayloadAction<{
            id?: number | null;
            name?: string | null;
            status?: string | null;
        }>) =>{
            state.lastLaneStatus = {
                ...state.lastLaneStatus,
                ...action.payload
            }
        }
    }
})

export const{
    setCurrentLane,
    setLastLaneStatus,
} = Slice.actions;

export const selectCurrentLane = (state: RootState) => state.laneView.currentLane;
export const selectLastLaneStatus = (state: RootState) => state.laneView.lastLaneStatus;


export default Slice.reducer;