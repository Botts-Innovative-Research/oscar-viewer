/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "./Store";
import {START_TIME} from "@/lib/data/Constants";

enableMapSet();

export interface IAppSlice {
    shouldLoadFromConfig: boolean;
    moveHighlighterTimestamp: string,
}

const initialState: IAppSlice = {
    shouldLoadFromConfig: false,
    moveHighlighterTimestamp: START_TIME
}

export const Slice = createSlice({
    name: 'AppStateSlice',
    initialState,
    reducers: {
        // Function to grab the timestamp from the layer to use with the Historical Chart Highlighter.
        setMoveHighlighterTimeStamp: ((state, action: PayloadAction<string>) => { state.moveHighlighterTimestamp = action.payload; }),
    }
})

export const { setMoveHighlighterTimeStamp } = Slice.actions;

export const selectMoveHighlighterTimeStamp = (state: RootState) => state.appState.moveHighlighterTimestamp

export default Slice.reducer;
