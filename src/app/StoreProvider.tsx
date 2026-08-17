/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

'use client'
import React, {useRef} from 'react';
import {Provider} from 'react-redux';
import {store, persistor, AppStore} from "@/lib/state/Store";
import { PersistGate } from 'redux-persist/integration/react';
import SuspenseLoad from "@/app/_components/SuspenseLoad";


export default function StoreProvider({children,}: {
    children: React.ReactNode
}) {
    const storeRef = useRef<AppStore>()
    if (!storeRef.current) {
        storeRef.current = store
    }

    // useEffect(() => {
    //     console.log("Persistor state after rehydration:", persistor.getState());
    // }, []);

    return (
        <Provider store={store}>
            <PersistGate
                loading={<SuspenseLoad />}
                persistor={persistor}
                onBeforeLift={() => {
                    console.log("Redux persist rehydration complete");
                }}
            >
                {children}
            </PersistGate>
        </Provider>
    );
}

