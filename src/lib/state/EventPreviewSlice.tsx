import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/lib/state/Store";
import { EventTableData } from "@/lib/data/oscar/TableHelpers";
import storage from "redux-persist/es/storage";
import {persistReducer} from "redux-persist";


// const persistConfig = {
//     key: 'eventPreview',
//     storage,
//     whitelist: ['eventPreview', 'shouldForceAlarmTableDeselect', 'selectedRowId']
// };


export interface IEventPreviewState {
    eventPreview: {
        isOpen: boolean;
        eventData: EventTableData | null;
    };
    shouldForceAlarmTableDeselect: boolean;
    selectedRowId: any | null;
}

const initState: IEventPreviewState = {
    eventPreview: {
        isOpen: false,
        eventData: null,
    },
    shouldForceAlarmTableDeselect: false,
    selectedRowId: null
};

export const Slice = createSlice({
    name: "EventPreviewState",
    initialState: initState,
    reducers: {
        setEventPreview: (state, action: PayloadAction<{ isOpen: boolean; eventData: EventTableData | null }>) => {
            console.log("Setting event preview:", action.payload);
            state.eventPreview = {
                isOpen: action.payload.isOpen,
                eventData: action.payload.eventData,
            };

        },
        toggleEventPreviewOpen: (state) => {
            state.eventPreview.isOpen = !state.eventPreview.isOpen;
        },
        setEventPreviewData: (state, action: PayloadAction<EventTableData>) => {
            state.eventPreview.eventData = action.payload;
        },
        clearEventPreview: (state) => {
            state.eventPreview = {
                isOpen: false,
                eventData: null,
            };
        },
        setShouldForceAlarmTableDeselect: (state, action: PayloadAction<boolean>) => {
            console.log(`Setting shouldForceAlarmTableDeselect to ${action.payload}`);
            state.shouldForceAlarmTableDeselect = action.payload;
        },
        toggleShouldForceAlarmTableDeselect: (state) => {
            state.shouldForceAlarmTableDeselect = !state.shouldForceAlarmTableDeselect;
        },
        setSelectedRowId: (state, action: PayloadAction<any | null>) =>{
            state.selectedRowId = action.payload;
        }
    },
});

export const {
    setEventPreview,
    toggleEventPreviewOpen,
    setEventPreviewData,
    clearEventPreview,
    setShouldForceAlarmTableDeselect,
    toggleShouldForceAlarmTableDeselect,
    setSelectedRowId
} = Slice.actions;

export const selectEventPreview = (state: RootState) => state.eventPreview.eventPreview;
export const selectShouldForceAlarmTableDeselect = (state: RootState) => state.eventPreview.shouldForceAlarmTableDeselect;
export const selectSelectedRowId = (state: RootState) => state.eventPreview.selectedRowId;

export default Slice.reducer;


// export default persistReducer(persistConfig, Slice.reducer);