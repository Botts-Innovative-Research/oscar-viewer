import React, {createContext, MutableRefObject, ReactNode, useContext, useEffect, useRef} from "react";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {AppStore} from "@/lib/state/Store";

interface IDataSourceContext {
    dataSources: Map<string, SweApi>
    masterTimeSyncRef: MutableRefObject<DataSynchronizer | undefined>
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);


export default function DataSourceProvider({children, store}: { children: ReactNode, store: AppStore }) {
    // will need to load from the config file at a later iteration
    const dataSources = new Map<string, SweApi>()
    const masterTimeSyncRef = useRef<DataSynchronizer>()

    useEffect(() => {
        const datastreams = store.getState().oshState.dataStreams

        datastreams.forEach((datastream) => {
            const sweApi = datastream.generateSweApiObj()
            dataSources.set(datastream.id, sweApi)
        })

    }, [store])

    if (!masterTimeSyncRef.current) {
        // get these properties from the store!
        masterTimeSyncRef.current = new DataSynchronizer({...store.getState().oshState.mainDataSynchronizer});
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
