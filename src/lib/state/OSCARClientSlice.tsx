import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {enableMapSet} from "immer";
import {RootState} from "./Store";

enableMapSet();

interface IOSCARClientState {
    cameraQuickView: {},
    laneStatus: {},
    alertsList: {},
    alertDetails: {},
}
