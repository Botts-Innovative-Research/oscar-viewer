'use client';

import React, {
    createContext,
    MutableRefObject,
    ReactNode, useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {useSelector} from "react-redux";
import {Datastream, IDatastream} from "@/lib/data/osh/Datastreams";
import {useAppDispatch, useAppStore} from "@/lib/state/Hooks";
import {INode, Node} from "@/lib/data/osh/Node";
import {addDatastream, getNodeById, setDatastreams, setSystems} from "@/lib/state/OSHSlice";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {System} from "@/lib/data/osh/Systems";
import {selectLanes, setLanes} from "@/lib/state/OSCARClientSlice";
import {selectDatastreamsOfLaneByName} from "@/lib/state/CustomSelectors";

interface IDataSourceContext {
    dataSources: Map<string, typeof SweApi>
    masterTimeSyncRef: MutableRefObject<typeof DataSynchronizer | undefined>
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);


export default function DataSourceProvider({children}: { children: ReactNode }) {
    const mainDataSynchronizer = useSelector((state: any) => state.oshSlice.mainDataSynchronizer);
    const isInitialized = useSelector((state: any) => state.oshSlice.isInitialized);
    const configNodeId = useSelector((state: any) => state.oscarClientSlice.configNodeId);
    const configNode: Node = useSelector((state: any) => getNodeById(state, configNodeId));
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: any) => state.oshSlice.nodes);
    const systems = useSelector((state: any) => state.oshSlice.systems);
    const [shouldFetchDatastreams, setShouldFetchDatastreams] = useState(false);
    const masterTimeSyncRef = useRef<typeof DataSynchronizer>()
    const dataSources = useSelector((state: any) => state.oshSlice.datasources);

    const InitializeApplication = useCallback(async () => {
        let cfgEP = configNode.getConfigEndpoint();
        // assume that the local server may have a config file that can be loaded
        let localConfigResp = await fetch(`${cfgEP}/systems?uid=urn:ornl:client:configs`, {
            headers: {
                ...configNode.getBasicAuthHeader()
            }
        })
        if (!localConfigResp.ok) {
            let localConfig = localConfigResp.json()
            console.info("Local config not loaded")
            // Need to fire off some sort of alert on the screen
        } else {
            // TODO: move this into a method in the slice writer/reader or somewhere else so it's 1 reusable and 2 not clogging up this Context file
            let localConfigJson = await localConfigResp.json();
            let systemId = localConfigJson.items[0].id;
            // get datastream ID
            let configDSResp = await fetch(encodeURI(`${cfgEP}/systems/${systemId}/datastreams`), {
                headers: {
                    ...configNode.getBasicAuthHeader()
                }
            });
            let configDSJson = await configDSResp.json();
            let dsID = configDSJson.items[0].id;
            // fetch the latest result
            let cfgObsResp = await fetch(`${cfgEP}/datastreams/${dsID}/observations?f=application/om%2Bjson&resultTime=latest`, {
                headers: {
                    ...configNode.getBasicAuthHeader()
                }
            });
            let cfgObsJson = await cfgObsResp.json();
            let cfgObservation = cfgObsJson.items[0];
            // get the config object file data
            let configString = cfgObservation.result.filedata;
            let configObj = JSON.parse(configString);
            // TODO Load into state
        }
    }, []);

    const laneFetch = useCallback(async () => {
        console.log("Nodes:", nodes);
        await Promise.all(nodes.map(async (node: INode) => {
            return await node.fetchLanes();
        })).then((fetched) => {
            console.log("Fetched:", fetched);
            let lanes = fetched.flatMap((item: any) => item.lanes);
            let systems = fetched.flatMap((item: any) => item.systems);

            dispatch(setLanes(lanes));
            dispatch(setSystems(systems));
            console.log("Statewide systems", systems)
        });
        console.info("Lanes fetched, continuing onward...");
    }, [nodes, dispatch]);

    const datastreamFetch = useCallback(async () => {
        await Promise.all(systems.map(async (system: System) => {
            return await system.fetchDataStreams();
        })).then((datastreams) => {
            const combinedDatastreams = datastreams.flat();
            let datastreamsMap = new Map<string, Datastream>();
            combinedDatastreams.forEach((datastreamJson: any) => {
                const datastream = new Datastream(datastreamJson.id, datastreamJson.name, datastreamJson["system@id"], [datastreamJson.validTime[0], datastreamJson.validTime[1]]);
                datastreamsMap.set(datastream.id, datastream);
                // dispatch(addDatastream(datastream))
            });
            dispatch(setDatastreams(datastreamsMap));
        });
    }, [systems, dispatch]);

    useEffect(() => {
        InitializeApplication();
        laneFetch();
        setShouldFetchDatastreams(true);
    }, [InitializeApplication]);

    useEffect(() => {
        if (shouldFetchDatastreams) {
            datastreamFetch();
        }
    }, [shouldFetchDatastreams]);


    // useMemo(() => {
    //     async function intializeItAll() {
    //         await InitializeApplication();
    //         await laneFetch();
    //     }
    //
    //     intializeItAll();
    //     setShouldFetchDatastreams(true);
    // }, []);

    // useMemo(() => {
    //     async function dsStuff() {
    //         await datastreamFetch();
    //     }
    //     dsStuff();
    //     setShouldTestLaneByName(true);
    // }, [shouldFetchDatastreams]);

    /*useEffect(() => {
        console.log("Datastreams of North Lane 1:", nl1Datastreams);
        console.log("All Datastreams:", dataStreams);
    }, [shouldTestLaneByName])*/

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