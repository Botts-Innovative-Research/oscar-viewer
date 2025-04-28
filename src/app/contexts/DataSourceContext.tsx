'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {changeConfigNode, setNodes} from "@/lib/state/OSHSlice";
import {selectLaneMap, setLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import { NodeOptions, Node, INode } from "@/lib/data/osh/Node";


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

    const handleLoadState = async () => {

        let responseJSON = await OSHSliceWriterReader.retrieveLatestConfig(configNode);
        if (responseJSON) {
            console.log("Config data retrieved: ", responseJSON);

            let cfgData = responseJSON.result.filedata;
            let cfgJSON = JSON.parse(cfgData);
            console.log("Config data parsed: ", cfgJSON);

            let nodes = cfgJSON.nodes.map((opt: NodeOptions) => new Node(opt));
            dispatch(setNodes(nodes));

        } else {
            console.log('Failed to load OSCAR State')
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

        await handleLoadState()

        let filedata = await OSHSliceWriterReader.retrieveLatestConfig(configNode);

        if (filedata) {
            console.log("Filedata from config node:", filedata);
            // load the filedata into the state
        } else {
            console.log("No filedata found from config node");
            // do nothing else for now
        }

    }, [dispatch, configNode]);


    function checkSystemFetchInterval() {
        console.log("Checking system fetch interval for TK Fetch...");
        return Date.now() - lastSystemFetch >= minSystemFetchInterval;
    }

    const testSysFetch = useCallback(async () => {
        console.log("Received new nodes, updating state\nNodes:");
        console.log(nodes);
        let allLanes: Map<string, LaneMapEntry> = new Map();
        // let allDatastreams: any[];
        await Promise.all(nodes.map(async (node: INode) => {
            console.log("Fetching lanes from node ", node);
            let nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();
            console.log("Fetching data streams from node ", node);
            await node.fetchDatastreams(nodeLaneMap);
            console.log("Fetching process video data streams from node ", node);
            await node.fetchProcessVideoDatastreams(nodeLaneMap);
            console.log("Fetching control streams from node ", node);
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


            console.log("nodelanemap", nodeLaneMap)

            nodeLaneMap.forEach((value, key) =>{
                allLanes.set(key,value);
            })
        }));


        console.log("all Lanes", allLanes)
        // fetch adjudication systems
        let adjMap: Map<string, string> = new Map();
        for(let node of nodes){
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
        testSysFetch().then(r => console.log("All Systems fetched. "));

        setLastSystemFetch(Date.now());

    }, [nodes]);

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
