import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

export interface EventDetailsState {
    eventData: EventTableData | null,
    // datasources: {
    //     gamma: typeof SweApi[];
    //     neutron: typeof SweApi[];
    //     threshold: typeof SweApi[];
    //     video: typeof SweApi[];
    //     occ: typeof SweApi[];
    // },
    status: {
        datasourcesReady: boolean;
    }
    speed: string;
}


const initialState: EventDetailsState ={
    eventData: null,
    // datasources: {
    //     gamma: [],
    //     neutron: [],
    //     threshold: [],
    //     video: [],
    //     occ: []
    // },
    status: {
        datasourcesReady: false
    },
    speed: null
}

export const Slice = createSlice({
    name: 'eventDetails',
    initialState: initialState,
    reducers:{
        setEventData: (state, action: PayloadAction<EventTableData>) => {
            state.eventData = action.payload;
        },
        // setDatasources: (state, action: PayloadAction<{
        //     gamma?: typeof SweApi[];
        //     neutron?: typeof SweApi[];
        //     threshold?: typeof SweApi[];
        //     video?: typeof SweApi[];
        //     occ?: typeof SweApi[];
        // }>) => {
        //     state.datasources = {
        //         ...state.datasources,
        //         ...action.payload
        //     };
        // },
        setDatasourcesReady: (state, action: PayloadAction<boolean>) => {
            state.status.datasourcesReady = action.payload;
        },
        setSpeed: (state, action: PayloadAction<string>) =>{
            state.speed = action.payload;
        },
    }
})

export const{
    setEventData,
    // setDatasources,
    setDatasourcesReady,
    setSpeed,
} = Slice.actions;

export const selectEventData = (state: RootState) => state.eventDetails.eventData;
// export const selectEventDatasources = (state: RootState) => state.eventDetails.datasources;
export const selectEventStatus = (state: RootState) => state.eventDetails.status;
export const selectSpeed = (state: RootState) => state.eventDetails.speed;

export default Slice.reducer;

