/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

'use client'
import {useRef} from 'react';
import {Provider} from 'react-redux';
import {makeStore, AppStore} from "@/lib/state/Store";

export default function StoreProvider({children,}: {
    children: React.ReactNode
}) {
    const storeRef = useRef<AppStore>()
    if (!storeRef.current) {
        storeRef.current = makeStore
    }
    return <Provider store={storeRef.current}>{children}</Provider>
}
