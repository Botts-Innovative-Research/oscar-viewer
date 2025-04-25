import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import ConSysApi from "osh-js/source/core/datasource/ConSysApi/ConSysApi.datasource";

export interface EventDetailsState {
    eventData: EventTableData | null,
    speed: string;
}


const initialState: EventDetailsState ={
    eventData: null,
    speed: null
}

export const Slice = createSlice({
    name: 'eventDetails',
    initialState: initialState,
    reducers:{
        setEventData: (state, action: PayloadAction<EventTableData>) => {
            state.eventData = action.payload;
        },

        setSpeed: (state, action: PayloadAction<string>) =>{
            state.speed = action.payload;
        },
    }
})

export const{
    setEventData,
    setSpeed,
} = Slice.actions;

export const selectEventData = (state: RootState) => state.eventDetails.eventData;
export const selectSpeed = (state: RootState) => state.eventDetails.speed;

export default Slice.reducer;

