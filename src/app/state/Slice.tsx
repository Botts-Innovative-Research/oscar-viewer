/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "./Store";

enableMapSet();

interface IOSCARClientState {
    shouldLoadFromConfig: boolean;
    laneCameraView: {},
    laneStatus: {},
    alertsList: {},
    alertDetails: {},
}

const initialState: IOSCARClientState = {
    shouldLoadFromConfig: false,
    laneCameraView: {},
    laneStatus: {},
    alertsList: {},
    alertDetails: {},
}

export const Slice = createSlice({
    name: 'OSCARViewerStateSlice',
    initialState,
    reducers: {
        setShouldLoadFromConfig: (state, action: PayloadAction<boolean>) => {
            state.shouldLoadFromConfig = action.payload;
        }
    }
})

export const { } = Slice.actions;

export default Slice.reducer;
