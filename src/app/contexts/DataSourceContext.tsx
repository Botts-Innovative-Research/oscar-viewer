import React, {createContext, useContext, useState, ReactNode, useEffect} from "react";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

interface IDataSourceContext{
    datasources: Map<string, SweApi>;
    setDatasources: React.Dispatch<React.SetStateAction<Map<string, SweApi>>>;
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);

export const DataSourceProvider = ({children}: {children: ReactNode}) => {
    // will need to load from the config file at a later iteration
    const [datasources, setDatasources] = useState<Map<string, SweApi>>(undefined);
    const [shouldCreateDatasources, setShouldCreateDatasources] = useState<boolean>(true);

    useEffect(() => {

    }, [shouldCreateDatasources]);

    return (
        <DataSourceContext.Provider value={{datasources, setDatasources}}>
            {children}
        </DataSourceContext.Provider>
    );
}
