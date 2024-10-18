/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */


import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {LaneMapEntry, LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {RootState} from "@/lib/state/Store";

import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import AdjudicationData from "@/lib/data/oscar/adjudication/Adjudication";

enableMapSet();

export interface IEventDataState {
    eventLog: EventTableData[],
    selectedEvent: EventTableData | null,
    hasFetchedInitial: boolean
}

const initialState: IEventDataState = {
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
        },
        setSelectedEvent: (state, action: PayloadAction<EventTableData>) => {
            state.selectedEvent = action.payload;
        },
        addEventToLog: (state, action: PayloadAction<EventTableData>) => {
            if (state.eventLog.some((data) => data.observationId === action.payload.observationId)) return;
            state.eventLog.push(action.payload);
        },
        updateSelectedEventAdjudication: (state, action: PayloadAction<AdjudicationData>) => {
            state.selectedEvent.adjudicatedData = action.payload;
            let eventInLogIdx = state.eventLog.findIndex((eventData) => eventData.id === state.selectedEvent.id)
            state.eventLog[eventInLogIdx].adjudicatedData = action.payload
        },
        setHasFetchedInitial: (state, action: PayloadAction<boolean>) => {
            state.hasFetchedInitial = action.payload;
        }
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
export const selectSelectedEvent = (state: RootState) => state.eventLogSlice.selectedEvent;
export const selectHasFetched = (state: RootState) => state.eventLogSlice.hasFetchedInitial;


export default Slice.reducer
