/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "@/lib/state/Store";

import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/es/storage";

enableMapSet();

// const persistConfig = {
//     key: 'eventLogSlice',
//     storage,
//     whitelist: ['eventLog', 'selectedEvent', 'hasFetchedInitial']
// };


export interface IEventDataState {
    // eventLog: Map<string, EventTableData>,
    eventLog: EventTableData[],
    selectedEvent: EventTableData | null,
    hasFetchedInitial: boolean
}

const initialState: IEventDataState = {
    // eventLog: new Map(),
    eventLog: [],
    selectedEvent: null,
    hasFetchedInitial: false
}

export const Slice = createSlice({
    name: "EventDataState",
    initialState,
    reducers: {
        setEventLogData: (state, action: PayloadAction<EventTableData[]>) => {
            state.eventLog = action.payload;
            // action.payload.forEach((eventData) => {
            //     state.eventLog.set(eventData.observationId, eventData);
            // })
        },
        setSelectedEvent: (state, action: PayloadAction<EventTableData>) => {
            state.selectedEvent = action.payload;
        },
        addEventToLog: (state, action: PayloadAction<EventTableData>) => {
            let checkForEntry = state.eventLog.some((evtData)=> evtData.observationId === action.payload.observationId);
            console.log("evt table, entry found status:", checkForEntry, action.payload.observationId);
            // if (state.eventLog.some((data) => data.observationId === action.payload.observationId)) return;
            console.log("EVT table Adding to Event Log", action.payload);
            let currentLog = [];
            currentLog =  [...state.eventLog];
            currentLog.push(action.payload);
            state.eventLog = currentLog;
            // state.eventLog.set(action.payload.observationId, action.payload);
        },
        updateSelectedEventAdjudication: (state, action: PayloadAction<AdjudicationData>) => {
            if(state.selectedEvent){
                const updatedEvent = {
                    ...state.selectedEvent,
                    adjudicatedData: action.payload
                };

                const eventInLogIdx = state.eventLog.findIndex((eventData) => eventData.id === state.selectedEvent.id);
                if (eventInLogIdx !== -1) {
                    state.eventLog[eventInLogIdx] = updatedEvent;
                }

                state.selectedEvent = updatedEvent;
            }

        },
        setHasFetchedInitial: (state, action: PayloadAction<boolean>) => {
            state.hasFetchedInitial = action.payload;
        },
    }
})

export const {
    setEventLogData,
    setSelectedEvent,
    addEventToLog,
    updateSelectedEventAdjudication,
    setHasFetchedInitial
} = Slice.actions

export const selectEventTableData = (state: RootState) => state.eventLogSlice.eventLog;
// export const selectEventTableDataArray = (state: RootState) => Array.from(state.eventLogSlice.eventLog.values());
export const selectEventTableDataArray = (state: RootState) => state.eventLogSlice.eventLog;
export const selectSelectedEvent = (state: RootState) => state.eventLogSlice.selectedEvent;
export const selectHasFetched = (state: RootState) => state.eventLogSlice.hasFetchedInitial;
export const selectUnadjudicatedTableData = (state: RootState) => {
    let tArr = Array.from(state.eventLogSlice.eventLog.values());
    return tArr.filter((entry) => entry.adjudicatedData.getCodeValue() === 0)
}
export const selectAlarmingTableData = (state: RootState) => {
    let tArr = Array.from(state.eventLogSlice.eventLog.values());
    return tArr.filter((entry: EventTableData) => entry.status !== 'None')
}
export const selectLaneTableData = (state: RootState, laneId: string) => {
    let tArr = Array.from(state.eventLogSlice.eventLog.values());
    return tArr.filter((entry: EventTableData) => entry.laneId == laneId)
}
export const selectAlarmingAndNonAdjudicatedData = (state: RootState) => {
    let tArr = Array.from(state.eventLogSlice.eventLog.values());
    return tArr.filter((entry: EventTableData) => entry.status !== 'None' && entry.adjudicatedData.getCodeValue() === 0);
}

export default Slice.reducer
// export default persistReducer(persistConfig, Slice.reducer);
