/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import { configureStore, combineReducers } from "@reduxjs/toolkit";
import storage from "redux-persist/lib/storage";
import { persistStore, persistReducer } from "redux-persist";
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";

import AppReducer from './Slice';
import OSHReducer from './OSHSlice';
import EventDataReducer from './EventDataSlice';
import OSCARClientReducer from "@/lib/state/OSCARClientSlice";

const persistConfig ={
    key: 'root',
    storage,
    whitelist: ['oscarClientSlice'],
}

const rootReducer = combineReducers({
    oscarClientSlice: OSCARClientReducer,
    appState: AppReducer,
    oshSlice: OSHReducer,
    eventLogSlice: EventDataReducer,
});


const persistedReducer = persistReducer(persistConfig, rootReducer);


export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
                // ignoredPaths: ["oscarClientSlice.eventDetailsState", "oscarClientSlice.eventPreview"],
            },
        }),
});


export const persistor = persistStore(store);

// export type AppStore = typeof store
// // Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// // Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
