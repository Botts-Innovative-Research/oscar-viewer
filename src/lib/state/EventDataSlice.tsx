/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "@/lib/state/Store";

import {AlarmTableData, EventTableData} from "@/lib/data/oscar/TableHelpers";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";


enableMapSet();


export interface IEventDataState {
    // eventLog: Map<string, EventTableData>,
    eventLog: EventTableData[],
    selectedEvent: EventTableData | null,
    hasFetchedInitial: boolean,
    laneViewLog: AlarmTableData[]
}

const initialState: IEventDataState = {
    // eventLog: new Map(),
    eventLog: [],
    selectedEvent: null,
    hasFetchedInitial: false,
    laneViewLog: []
}

export const Slice = createSlice({
    name: "EventDataState",
    initialState,
    reducers: {
        setLaneViewLogData: (state, action: PayloadAction<AlarmTableData[]>) => {
            state.laneViewLog = action.payload;
        },
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
            // if (state.eventLog.some((data) => data.observationId === action.payload.observationId)) return;

            let currentLog = [];

            // if(!checkForEntry){
                // state.eventLog.push(action.payload);

            currentLog =  [...state.eventLog];
            currentLog.push(action.payload);
            state.eventLog = currentLog;
            console.log("EVT table Adding to Event Log", action.payload);
            // }else{
            //     console.log("Duplicate event ignored: ", action.payload.observationId)
            // }


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

        addEventToLaneViewLog: (state, action: PayloadAction<AlarmTableData>) => {
            console.log("Alarm Status Adding to Log", action.payload)

            let currentLog = [];
            currentLog = [...state.laneViewLog];
            currentLog.push(action.payload);
            state.laneViewLog = currentLog;
        },
    }
})

export const {
    setEventLogData,
    setSelectedEvent,
    addEventToLog,
    updateSelectedEventAdjudication,
    setHasFetchedInitial,
    setLaneViewLogData,
    addEventToLaneViewLog,
} = Slice.actions

export const selectLaneViewLog = (state: RootState) => state.eventLogSlice.laneViewLog;
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
