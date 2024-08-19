import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";

enableMapSet();

export interface IOSCARClientState {
    configNodeId: number,
    currentUser: string,
    quickActions: [],
    alertDetails: {
        isOpen: boolean,
        currentLane: string,
        startTime: string,
        endTime: string,
    },
    // This should move to a separate slice
    lanes: LaneMeta[]
}

const initialState: IOSCARClientState = {
    configNodeId: 1,
    currentUser: '',
    quickActions: [],
    alertDetails: {
        isOpen: false,
        currentLane: '',
        startTime: '',
        endTime: ''
    },
    lanes: []
}


export const Slice = createSlice({
    name: 'ClientStateSlice',
    initialState,
    reducers: {
        setCurrentUser: (state, action: PayloadAction<string>) => {
            state.currentUser = action.payload;
        },
        setQuickActions: (state, action: PayloadAction<[]>) => {
            state.quickActions = action.payload;
        },
        setAlertDetails: (state, action: PayloadAction<{
            isOpen: boolean,
            currentLane: string,
            startTime: string,
            endTime: string
        }>) => {
            state.alertDetails = action.payload;
        },
        setLanes: (state, action: PayloadAction<LaneMeta[]>) => {
            state.lanes = action.payload;
        },
        toggleAlertDetails: (state) => {
            state.alertDetails.isOpen = !state.alertDetails.isOpen;
        },
        setADCurrentLane: (state, action: PayloadAction<string>) => {
            state.alertDetails.currentLane = action.payload;
        }
    }
})

export const {
    setCurrentUser,
    setQuickActions,
    setAlertDetails,
    setLanes,
    toggleAlertDetails,
    setADCurrentLane
} = Slice.actions;

export const selectConfigNodeId = (state: any) => state.OSCARClientState.configNodeId;
export const selectCurrentUser = (state: any) => state.OSCARClientState.currentUser;
export const selectLanes = (state: any) => state.OSCARClientState.lanes;

export default Slice.reducer;
