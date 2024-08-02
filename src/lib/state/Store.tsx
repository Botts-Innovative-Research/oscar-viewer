/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {configureStore} from '@reduxjs/toolkit';
import AppReducer from './Slice';
import OSHReducer from './OSHSlice';

export const makeStore = configureStore({
    reducer: {
        appState: AppReducer,
        oshState: OSHReducer,
    },
    middleware: (getDefaultMiddleWare) =>
        getDefaultMiddleWare({
            serializableCheck: false
        })
});

export type AppStore = typeof makeStore
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof makeStore.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof makeStore.dispatch
