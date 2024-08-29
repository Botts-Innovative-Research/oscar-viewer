'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState} from "react";
// @ts-ignore
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
// @ts-ignore
import DataSynchronizer from "osh-js/source/core/timesync/DataSynchronizer";
import {useSelector} from "react-redux";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {useAppDispatch} from "@/lib/state/Hooks";
import {INode, Node} from "@/lib/data/osh/Node";
import {
    changeConfigNode,
    selectDataSourceByOutputType, selectDatastreamByOutputType,
    setDatasources,
    setDatastreams,
    setSystems
} from "@/lib/state/OSHSlice";
import {System} from "@/lib/data/osh/Systems";
import {selectDatastreamsOfLaneByTypes, selectLaneByName, setLanes} from "@/lib/state/OSCARClientSlice";
import {RootState} from "@/lib/state/Store";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";

interface IDataSourceContext {
    masterTimeSyncRef: MutableRefObject<typeof DataSynchronizer | undefined>
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);


export default function DataSourceProvider({children}: { children: ReactNode }) {
    const mainDataSynchronizer = useSelector((state: RootState) => state.oshSlice.mainDataSynchronizer);
    // const isInitialized = useSelector((state: RootState) => state.oshSlice.isInitialized);
    const configNode: Node = useSelector((state: RootState) => state.oshSlice.configNode);
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const systems = useSelector((state: RootState) => state.oshSlice.systems);
    const masterTimeSyncRef = useRef<typeof DataSynchronizer>();
    const datastreams = useSelector((state: RootState) => state.oshSlice.dataStreams);
    const dataSources = useSelector((state: RootState) => state.oshSlice.datasources);
    const selectGammaCountDS = selectDatastreamByOutputType(['Driver - Gamma Count']);
    const gammaCountDS = useSelector((state: RootState) => selectGammaCountDS(state));

    const northLaneSelector = selectLaneByName('North Lane 1');
    const northLane: LaneMeta = useSelector((state: RootState) => northLaneSelector(state));

    // const selectNorthLaneGammaCountDS = selectDatastreamsOfLaneByTypes(northLane.id,['Driver - Gamma Count']);
    const selectNorthLaneGammaCountDS = northLane?.id ? selectDatastreamsOfLaneByTypes(northLane.id, ['Driver - Gamma Count']) : (): any[] => [];
    // const NorthLaneGammaCountDS = useSelector((state: RootState) => selectNorthLaneGammaCountDS(state));
    const NorthLaneGammaCountDS = useSelector((state: RootState) => selectNorthLaneGammaCountDS(state) ?? []);

    const InitializeApplication = useCallback(async () => {
        if (!configNode) {
            // if no default node, then just grab the first node in the list and try to use that
            if (nodes.length > 0) {
                if (nodes[0].isDefaultNode) {
                    dispatch(changeConfigNode(nodes[0]));
                    return; // force a rerender...
                }
            }
            console.error("No config node found in state. Cannot initialize application.");
        }

        console.log("Initializing application...");
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
    }, [dispatch, configNode]);

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
        console.warn("Fetching datastreams of systems...", systems);
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

    const createAllDataSources = useCallback(() => {
        let dsArr = [];
        const datastreamArr: Datastream[] = Array.from(datastreams.values());
        console.warn("Creating all data sources...", datastreamArr);
        for (let datastream of datastreamArr) {
            let datasource = datastream.generateSweApiObj({
                start: datastream.phenomenonTime.beginPosition,
                end: 'latest'
            });
            dsArr.push(datasource);
            console.log("DS Array:", dsArr);
        }
        dispatch(setDatasources(dsArr));
    }, [datastreams, dispatch]);

    useEffect(() => {
        InitializeApplication();
        laneFetch();
    }, [InitializeApplication]);

    useEffect(() => {
        datastreamFetch();
    }, [systems]);

    useEffect(() => {
        if (datastreams.size > 0) {
            createAllDataSources();
        }
    }, [datastreams]);

    useEffect(() => {
        console.log("DataStreams:", datastreams);
        console.log("Data sources:", dataSources);
        console.log("Gamma Count DS:", gammaCountDS);
        console.warn("North Lane Gamma Count DS:", NorthLaneGammaCountDS);
    }, [dataSources]);

    if (!masterTimeSyncRef.current) {
        masterTimeSyncRef.current = new DataSynchronizer({...mainDataSynchronizer});
    }


    return (
        <DataSourceContext.Provider value={{masterTimeSyncRef}}>
            {children}
        </DataSourceContext.Provider>
    );
};
