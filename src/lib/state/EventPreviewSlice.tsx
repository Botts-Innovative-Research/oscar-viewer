import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/lib/state/Store";
import { EventTableData } from "@/lib/data/oscar/TableHelpers";

export interface IEventPreviewState {
    eventPreview: {
        isOpen: boolean;
        eventData: EventTableData | null;
    };
    shouldForceAlarmTableDeselect: boolean;
    selectedRowId: any | null;
    latestGB: number;
}3

const initState: IEventPreviewState = {
    eventPreview: {
        isOpen: false,
        eventData: null,
    },
    shouldForceAlarmTableDeselect: false,
    selectedRowId: null,
    latestGB: null,
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
        },
        setLatestGB: (state, action: PayloadAction<number>) =>{
            state.latestGB = action.payload;
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
    setSelectedRowId,
    setLatestGB
} = Slice.actions;

export const selectEventPreview = (state: RootState) => state.eventPreview.eventPreview;
export const selectShouldForceAlarmTableDeselect = (state: RootState) => state.eventPreview.shouldForceAlarmTableDeselect;
export const selectSelectedRowId = (state: RootState) => state.eventPreview.selectedRowId;
export const selectLatestGB = (state: RootState) => state.eventPreview.latestGB;

export default Slice.reducer;
