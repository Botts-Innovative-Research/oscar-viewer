'use client';

import React, {createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef} from "react";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {useSelector} from "react-redux";
import {Datastream} from "@/lib/data/osh/Datastreams";

interface IDataSourceContext {
    dataSources: Map<string, typeof SweApi>
    masterTimeSyncRef: MutableRefObject<typeof DataSynchronizer | undefined>
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);


export default function DataSourceProvider({children}: { children: ReactNode }) {
    const dataStreams: Datastream[] = useSelector((state: any) => state.oshState.dataStreams);
    const mainDataSynchronizer = useSelector((state: any) => state.oshState.mainDataSynchronizer);
    // will need to load from the config file at a later iteration
    const dataSources = new Map<string, typeof SweApi>()
    const masterTimeSyncRef = useRef<typeof DataSynchronizer>()

    useEffect(() => {
        dataStreams.forEach((datastream) => {
            const sweApi = datastream.generateSweApiObj()
            dataSources.set(datastream.id, sweApi)
        })

    }, [dataStreams])

    if (!masterTimeSyncRef.current) {
        // get these properties from the store!
        masterTimeSyncRef.current = new DataSynchronizer({...mainDataSynchronizer});
    }


    return (
        <DataSourceContext.Provider value={{dataSources, masterTimeSyncRef}}>
            {children}
        </DataSourceContext.Provider>
    );
};

export const useDSContext = (): IDataSourceContext => {
    const context = useContext(DataSourceContext);
    if (!context) {
        throw new Error('useRefContext must be used within a DataSourceProvider');
    }
    return context;
}
