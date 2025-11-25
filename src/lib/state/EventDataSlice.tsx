import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "@/lib/state/Store";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {useState} from "react";

enableMapSet();

export interface IEventDataState {
    selectedEvent: EventTableData | null,
    refreshToken: number,
    adjudicatedEventId: number | null,
    triggerAlarm: boolean
}

const initialState: IEventDataState = {
    selectedEvent: null,
    refreshToken: 0,
    adjudicatedEventId: null,
    triggerAlarm: false
}

export const Slice = createSlice({
    name: "EventDataState",
    initialState,
    reducers: {
        setSelectedEvent: (state, action: PayloadAction<EventTableData>) => {
            state.selectedEvent = action.payload;
        },
        triggerEventTableRefresh(state) {
            state.refreshToken = Date.now();
        },
        setAdjudicatedEventId(state, action: PayloadAction<number | null>) {
            state.adjudicatedEventId = action.payload;
        },
        setAlarmTrigger(state, action: PayloadAction<boolean | null>) {
            state.triggerAlarm = action.payload;
        }
    }
})

export const {
    setSelectedEvent,
    triggerEventTableRefresh,
    setAdjudicatedEventId,
    setAlarmTrigger
} = Slice.actions


export const selectTriggeredAlarm = (state: RootState) => state.eventLogSlice.triggerAlarm;
export const selectEventTableRefreshToken = (state: RootState) => state.eventLogSlice.refreshToken;
export const selectSelectedEvent = (state: RootState) => state.eventLogSlice.selectedEvent;
export const selectAdjudicatedEventId = (state: RootState) => state.eventLogSlice.adjudicatedEventId;
export default Slice.reducer