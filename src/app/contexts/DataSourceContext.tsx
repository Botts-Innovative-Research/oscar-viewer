'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {addNode, changeConfigNode, setNodes} from "@/lib/state/OSHSlice";
import {selectLaneMap, setLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";
import ConfigData, { retrieveLatestConfigDataStream } from "../_components/state-manager/Config";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";


interface IDataSourceContext {
    laneMapRef: MutableRefObject<Map<string, LaneMapEntry>> | undefined
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);

export {DataSourceContext};


export default function DataSourceProvider({children}: { children: ReactNode }) {

    const configNode: Node = useSelector((state: RootState) => state.oshSlice.configNode);
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const minSystemFetchInterval = 30000;
    const [lastSystemFetch, setLastSystemFetch] = React.useState<number>(0);
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const laneMapRef = useRef<Map<string, LaneMapEntry>>(new Map<string, LaneMapEntry>());

    const dispatch = useAppDispatch();

    useEffect(() => {

        let hostName = window.location.hostname;

        const initialNodeOpts: NodeOptions = {
            name: "Local Node",
            address:  hostName,
            port: 8282,
            oshPathRoot: "/sensorhub",
            sosEndpoint: "/sos",
            csAPIEndpoint: "/api",
            configsEndpoint: "/configs",
            auth: {username: "admin", password: "oscar"},
            isSecure: false,
            isDefaultNode: true
        }

        dispatch(addNode(initialNodeOpts));
        dispatch(changeConfigNode(initialNodeOpts));

    }, [dispatch]);

    const handleLoadState = async () => {

        let latestConfigDs = await retrieveLatestConfigDataStream(configNode);

        if (latestConfigDs) {

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);

            if(latestConfigData == null) return;

            let nodes = latestConfigData.nodes.map(mapNodeFromConfig);

            dispatch(setNodes(nodes));

        } else {
            console.warn('Failed to load OSCAR State')
        }
    }

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

        await handleLoadState();

    }, [dispatch, configNode]);

    const fetchLatestConfigObservation = async(ds: any) =>{
        const observations = await ds.searchObservations(new ObservationFilter({ resultTime: 'latest'}), 1);

        let obsResult = await observations.nextPage();

        if(!obsResult) return;

        let configData = obsResult.map((obs: any) =>{
            let data = new ConfigData(obs.phenomenonTime, obs.id, obs.result.user, obs.result.nodes, obs.result.numNodes)
            return data;
        })

        console.log("config data", configData)
        return configData[0];
    }

    function checkSystemFetchInterval() {
        console.log("Checking system fetch interval for TK Fetch...");
        return Date.now() - lastSystemFetch >= minSystemFetchInterval;
    }

    function mapNodeFromConfig(opt: any): Node{
        return new Node({
            name: opt.name,
            address: opt.address,
            port: opt.port,
            oshPathRoot: opt.oshPathRoot,
            sosEndpoint: opt.sosEndpoint,
            configsEndpoint: opt.configsEndpoint,
            csAPIEndpoint: opt.csAPIEndpoint,
            auth: {
                username: opt?.auth?.username ? opt.auth.username : opt.username,
                password: opt?.auth?.password ? opt.auth.password : opt.password,
            },
            isSecure: opt.isSecure,
            isDefaultNode: opt.isDefaultNode,
            laneAdjMap: opt.laneAdjMap
        });
    }

    const testSysFetch = useCallback(async () => {
        console.log("Received new nodes, updating state:", nodes);

        let newNodes = nodes.map(mapNodeFromConfig);

        let allLanes: Map<string, LaneMapEntry> = new Map();

        await Promise.all(newNodes.map(async (node: INode) => {
            console.log("Fetching lanes from node ", node);

            let nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();

            if(!nodeLaneMap) return;
            await node.fetchDatastreams(nodeLaneMap);
            await node.fetchProcessVideoDatastreams(nodeLaneMap);
            await node.fetchControlStreams(nodeLaneMap);


            for (const [key, mapEntry] of nodeLaneMap.entries()) {
                console.log(`[BEFORE] addDefaultConSysApis for ${key}`, mapEntry);
                try {
                    mapEntry.addDefaultConSysApis();
                } catch (e) {
                    console.error(`[ERROR] addDefaultConSysApis failed for ${key}:`, e);
                }
                console.log(`[AFTER] addDefaultConSysApis for ${key}`, mapEntry.datasourcesRealtime, mapEntry.datasourcesBatch);
            }


            nodeLaneMap.forEach((value: LaneMapEntry, key: string) =>{
                allLanes.set(key,value);
            })
        }));


        // fetch adjudication systems
        let adjMap: Map<string, string> = new Map();
        for(let node of newNodes){
            console.log("[ADJ] Fetching adjudication systems for node: ", node, allLanes);
           adjMap = await node.fetchOrCreateAdjudicationSystems(allLanes);

        }
        console.log("[ADJ] Adjudication Systems Map:", adjMap);

        // dispatch(setDatastreams(allDatastreams));
        dispatch(setLaneMap(allLanes));
        laneMapRef.current = allLanes;
        console.log("LaneMapRef for Table:", laneMapRef);

    }, [nodes]);

    useEffect(() => {
        if (laneMap.size > 0) {
            console.log("LaneMap After Update:", laneMap);
            if (laneMap.has("lane1")) {
                let ds: LaneMapEntry = laneMap.get("lane1")
                console.log("LaneMap test for prop datastream:", ds.hasOwnProperty("datastreams"));
                console.log("LaneMap test systems:", ds.systems);
                console.log("LaneMap test DS:", ds.datastreams[0]);
                let test = ds.datastreams[0].stream();
                console.log("LaneMap test DS stream:", test);
            }
        }
    }, [laneMap]);

    useEffect(() => {
        testSysFetch();

        setLastSystemFetch(Date.now());

    }, [nodes, nodes.length]);

    useEffect(() => {
        InitializeApplication();
    }, [InitializeApplication]);



    return (
        <>
            <DataSourceContext.Provider value={{laneMapRef}}>
                {children}
            </DataSourceContext.Provider>
        </>
    );
};
