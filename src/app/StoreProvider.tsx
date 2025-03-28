/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

'use client'
import React, {useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {store, persistor} from "@/lib/state/Store";
import { PersistGate } from 'redux-persist/integration/react';
import LoadingDashboard from "@/app/_components/skeleton/LoadingDashboard";


export default function StoreProvider({children,}: {
    children: React.ReactNode
}) {
    // const storeRef = useRef<AppStore>()
    // if (!storeRef.current) {
    //     storeRef.current = makeStore
    // }

    useEffect(() => {
        console.log("Persistor state after rehydration:", persistor.getState());
    }, []);

    return (
        <Provider store={store}>
            <PersistGate loading={<p>Loading....</p>} persistor={persistor}>
                {children}
            </PersistGate>
        </Provider>
    );
}

