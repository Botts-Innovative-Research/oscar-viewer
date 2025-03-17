import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";


export interface LaneViewState {
    datasources: {
        gamma: any[];
        neutron: any[];
        threshold: any[];
        video: any[];
        occ: any[],
    },
    currentLane: string;
    status: {
        datasourcesReady: boolean;
    };
    lastLaneStatus: {
        id: number;
        name: string,
        status: string
    }

}

const initialState: LaneViewState = {
    datasources: {
        gamma: [],
        neutron: [],
        threshold: [],
        video: [],
        occ: []
    },
    currentLane: null,
    status: {
        datasourcesReady: false
    },
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
        setDatasources: (state, action: PayloadAction<{
            gamma?: any[];
            neutron?: any[];
            threshold?: any[];
            video?: any[];
            occ?: any[];
        }>) => {
            state.datasources = {
                ...state.datasources,
                ...action.payload
            };
        },
        setDatasourcesReady: (state, action: PayloadAction<boolean>) => {
            state.status.datasourcesReady = action.payload;
        },
        setCurrentLane: (state, action: PayloadAction<string>) =>{
            state.currentLane = action.payload;
        },
        setLastLaneStatus: (state, action: PayloadAction<{
            id?: null;
            name?: null;
            status?: null;
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
    setDatasources,
    setDatasourcesReady,
    setLastLaneStatus,
} = Slice.actions;

export const selectCurrentLane = (state: RootState) => state.laneView.currentLane;
export const selectLastLaneStatus = (state: RootState) => state.laneView.lastLaneStatus;


export default Slice.reducer;