import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/es/storage";

const persistConfig = {
    key: 'eventDetails',
    storage,
    whitelist: ['eventData', 'datasources', 'status']
};

export interface EventDetailsState {
    eventData: EventTableData | null,
    datasources: {
        gamma: any[];
        neutron: any[];
        threshold: any[];
        video: any[];
        occ: any[],
    },
    status: {
        datasourcesReady: boolean;
    };
}


const initialState: EventDetailsState ={
    eventData: null,
    datasources: {
        gamma: [],
        neutron: [],
        threshold: [],
        video: [],
        occ: []
    },
    status: {
        datasourcesReady: false
    }
}

export const Slice = createSlice({
    name: 'eventDetails',
    initialState: initialState,
    reducers:{
        setEventData: (state, action: PayloadAction<EventTableData>) => {
            state.eventData = action.payload;
        },
        setDatasources: (state, action: PayloadAction<{
            gamma?: any[];
            neutron?: any[];
            threshold?: any[];
            video?: any[];
            occ?: any[];
        }>) => {
            state.datasources = {
                ...state.datasources,
                ...action.payload
            };
        },
        setDatasourcesReady: (state, action: PayloadAction<boolean>) => {
            state.status.datasourcesReady = action.payload;
        },
        clearEventDetails: (state) => {
            state.eventData = null;
            state.datasources = {
                gamma: [],
                neutron: [],
                threshold: [],
                video: [],
                occ: []
            };
            state.status.datasourcesReady = false;
        }
    }
})

export const{
    setEventData,
    setDatasources,
    setDatasourcesReady,
    clearEventDetails
} = Slice.actions;

export const selectEventData = (state: RootState) => state.eventDetails.eventData;
export const selectEventDatasources = (state: RootState) => state.eventDetails.datasources;
export const selectEventStatus = (state: RootState) => state.eventDetails.status;

// export default Slice.reducer;

export default persistReducer(persistConfig, Slice.reducer);
