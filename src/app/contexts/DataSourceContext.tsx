'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {addNode, changeConfigNode, setNodes} from "@/lib/state/OSHSlice";
import {setLaneMap} from "@/lib/state/OSCARLaneSlice";
import {AppDispatch, RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";



interface IDataSourceContext {
    laneMapRef: MutableRefObject<Map<string, LaneMapEntry>> | undefined
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);

export {DataSourceContext};


export default function DataSourceProvider({children}: { children: ReactNode }) {

    const configNode = useSelector((state: RootState) => state.oshSlice.configNode);
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const laneMapRef = useRef<Map<string, LaneMapEntry>>(new Map<string, LaneMapEntry>());


    useEffect(() => {
        if (!nodes || nodes.length == 0)
            dispatch(initializeDefaultNode());
    }, [nodes]);


    const InitializeApplication = useCallback(async () => {

        if (!configNode) {
            // if no default node, then just grab the first node in the list and try to use that
            if (nodes.length > 0) {
                const defaultNode = nodes.find((n) => n.isDefaultNode || nodes[0])

                dispatch(changeConfigNode(defaultNode))
            }
        }
    }, [nodes, configNode]);


    const testSysFetch = async () => {

        let allLanes: Map<string, LaneMapEntry> = new Map();

        await Promise.all(nodes.map(async (node: INode) => {
            console.log("node", node)
            let nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();
            if(!nodeLaneMap) return;

            await node.authFileServer();
            await node.fetchOscarServiceSystem();
            await node.fetchDatastreams(nodeLaneMap);
            await node.fetchLaneControlStreams(nodeLaneMap);


            for (const [key, mapEntry] of nodeLaneMap.entries()) {
                try {
                    mapEntry.addDefaultConSysApis();
                } catch (e) {
                    console.error(`[ERROR] addDefaultConSysApis failed for ${key}:`, e);
                }
            }

            nodeLaneMap.forEach((value: LaneMapEntry, key: string) =>allLanes.set(key,value));
        }));

        dispatch(setLaneMap(allLanes));
        laneMapRef.current = allLanes;
    }

    useEffect(() => {
        const init = async () => {
            await InitializeApplication();
            await testSysFetch();
        }
        init();
    }, [nodes]);

    return (
        <DataSourceContext.Provider value={{laneMapRef}}>
            {children}
        </DataSourceContext.Provider>
    );
};

export const initializeDefaultNode = () => (dispatch: AppDispatch) => {
    const hostName = window.location.hostname;

    const initialNodeOpts: NodeOptions = {
        name: "Local Node",
        address: hostName,
        port: 8282,
        oshPathRoot: "/sensorhub",
        csAPIEndpoint: "/api",
        auth: { username: "admin", password: "oscar" },
        isSecure: false,
        isDefaultNode: true
    };

    const defaultNode = new Node(initialNodeOpts);
    dispatch(addNode(defaultNode));
    dispatch(changeConfigNode(defaultNode));
};