import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "@/lib/state/Store";

enableMapSet();

export interface IOSCARClientState {
    currentUser: string,
    quickActions: [],
    alertTimeoutSeconds: number,
    alarmAudioVolume: number,
}

const initialState: IOSCARClientState = {
    currentUser: 'testuser',
    quickActions: [],
    alertTimeoutSeconds: 10,
    alarmAudioVolume: 30
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

        setAlertTimeoutSeconds: (state, action: PayloadAction<number>) => {
            state.alertTimeoutSeconds = action.payload;
        },

        setAlarmAudioVolume: (state, action: PayloadAction<number>) =>{
            state.alarmAudioVolume = action.payload;
        }
    }
})


export const {
    setCurrentUser,
    setQuickActions,
    setAlertTimeoutSeconds,
    setAlarmAudioVolume
} = Slice.actions;

export const selectCurrentUser = (state: RootState) => state.oscarClientSlice.currentUser;


export const selectAlarmAudioVolume = (state: RootState) => state.oscarClientSlice.alarmAudioVolume;

export default Slice.reducer;