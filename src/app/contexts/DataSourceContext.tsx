'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";
import {changeConfigNode, setNodes} from "@/lib/state/OSHSlice";
import {selectLaneMap, setLaneMap} from "@/lib/state/OSCARClientSlice";
import {RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {OSHSliceWriterReader} from "@/lib/data/state-management/OSHSliceWriterReader";
import AlarmAudio from "../_components/AlarmAudio";

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
        await Promise.all(nodes.map(async (node: INode) => {
            console.log("Fetching lanes from node ", node);
            let nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();
            await node.fetchDatastreamsTK(nodeLaneMap);
            await node.fetchProcessVideoDatastreams(nodeLaneMap);
            for (let mapEntry of nodeLaneMap.values()) {
                mapEntry.addDefaultSWEAPIs();
            }
            let nodeControlStreams = await node.fetchControlStreams()

            nodeLaneMap.forEach((value, key) => {
                const controlStream = nodeControlStreams.find((cStream: any) =>
                    value.systems.some((system) => system.properties.id === cStream['system@id'])
                );
                console.log("Found Matching Control Stream", controlStream);
                value.addControlStreamId(controlStream.id);
                allLanes.set(key, value);
            });
        }));

        // fetch adjudication systems
        let adjMap: Map<string, string> = new Map();
        for(let node of nodes){
            console.log("[ADJ] Fetching adjudication systems for node: ", node, allLanes);
            adjMap = await node.fetchOrCreateAdjudicationSystems(allLanes);
        }
        console.log("[ADJ] Adjudication Systems Map:", adjMap);

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

    }, [nodes]);

    useEffect(() => {
        InitializeApplication();
    }, [InitializeApplication]);

    return (<>
        <DataSourceContext.Provider value={{laneMapRef}}>
            {children}
        </DataSourceContext.Provider>
        </>
    );
};
