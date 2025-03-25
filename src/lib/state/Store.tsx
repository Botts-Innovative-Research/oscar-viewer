/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {configureStore, combineReducers, createStore} from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import AppReducer from './Slice';
import OSHReducer from './OSHSlice';
import EventDataReducer from './EventDataSlice';
import OSCARClientReducer from "@/lib/state/OSCARClientSlice";
import OSCARLaneReducer from "@/lib/state/OSCARLaneSlice";
import EventDetailsReducer from "@/lib/state/EventDetailsSlice";
import EventPreviewReducer from "@/lib/state/EventPreviewSlice";
import LaneViewReducer from "@/lib/state/LaneViewSlice";
// import laneMapTransform from "@/lib/state/LaneMapTransform";

const persistConfig ={
    key: 'root',
    storage,
    whitelist: ['oscarClientSlice', 'eventPreview', 'laneSlice', 'laneView', 'eventLogSlice', "eventDetails"],
    version: 1,
}

const rootReducer = combineReducers({
    oscarClientSlice: OSCARClientReducer,
    appState: AppReducer,
    oshSlice: OSHReducer,
    eventLogSlice: EventDataReducer,
    laneSlice: OSCARLaneReducer,
    eventPreview: EventPreviewReducer,
    laneView: LaneViewReducer,
    eventDetails: EventDetailsReducer
});


const persistedReducer = persistReducer(persistConfig, rootReducer);


export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
            }
        }),
});

export const persistor = persistStore(store);


//if you make changes to the slices call this function
// persistor.purge();

export type AppStore = typeof store
// // Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// // Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
