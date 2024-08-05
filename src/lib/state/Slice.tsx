/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "./Store";
import {START_TIME} from "@/lib/data/Constants";

enableMapSet();

interface IOSCARClientState {
    shouldLoadFromConfig: boolean;
    laneCameraView: {},
    laneStatus: {},
    alertsList: {},
    alertDetails: {},
    moveHighlighterTimestamp: string,
}

const initialState: IOSCARClientState = {
    shouldLoadFromConfig: false,
    laneCameraView: {},
    laneStatus: {},
    alertsList: {},
    alertDetails: {},
    moveHighlighterTimestamp: START_TIME
}

export const Slice = createSlice({
    name: 'OSCARViewerStateSlice',
    initialState,
    reducers: {
        setShouldLoadFromConfig: (state, action: PayloadAction<boolean>) => {
            state.shouldLoadFromConfig = action.payload;
        },
        // Function to grab the timestamp from the layer to use with the Historical Chart Highlighter.
        setMoveHighlighterTimeStamp: ((state, action: PayloadAction<string>) => { state.moveHighlighterTimestamp = action.payload; }),
    }
})

export const { setMoveHighlighterTimeStamp } = Slice.actions;

export const selectMoveHighlighterTimeStamp = (state: RootState) => state.appState.moveHighlighterTimestamp

export default Slice.reducer;
