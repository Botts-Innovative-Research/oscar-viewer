import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {RootState} from "@/lib/state/Store";

enableMapSet();

export interface IOSCARClientState {
    configNodeId: number,
    currentUser: string,
    quickActions: [],
    alertDetailIsOpen: boolean,
    alertDetails: {
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
    alertDetailIsOpen: false,
    alertDetails: {
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
        setConfigNodeId: (state, action: PayloadAction<number>) => {
            state.configNodeId = action.payload;
        },
        setCurrentUser: (state, action: PayloadAction<string>) => {
            state.currentUser = action.payload;
        },
        setQuickActions: (state, action: PayloadAction<[]>) => {
            state.quickActions = action.payload;
        },
        setAlertDetailIsOpen: (state, action: PayloadAction<boolean>) => {
            state.alertDetailIsOpen = action.payload;
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
            state.alertDetailIsOpen = !state.alertDetailIsOpen;
        },
        setAlertDetailsDCurrentLane: (state, action: PayloadAction<string>) => {
            state.alertDetails.currentLane = action.payload;
        }
    }
})

export const {
    setConfigNodeId,
    setCurrentUser,
    setQuickActions,
    setAlertDetails,
    setLanes,
    toggleAlertDetails,
    setAlertDetailsDCurrentLane
} = Slice.actions;

export const selectConfigNodeId = (state: RootState) => state.oscarClientSlice.configNodeId;
export const selectCurrentUser = (state: RootState) => state.oscarClientSlice.currentUser;
export const selectLanes = (state: RootState) => state.oscarClientSlice.lanes;
export const selectLaneByName = (laneName: string) => (state: RootState) => {
    console.info("Lane Name should be: ", laneName, state.oscarClientSlice.lanes);
    return state.oscarClientSlice.lanes.find((lane: { name: string }) => lane.name === laneName);
}
export const selectLaneById = (laneId: string) => (state: RootState) => {
    return state.oscarClientSlice.lanes.find((lane: { id: string }) => lane.id === laneId);
}
export const selectAlertDetails = (state: RootState) => state.oscarClientSlice.alertDetails;

export default Slice.reducer;