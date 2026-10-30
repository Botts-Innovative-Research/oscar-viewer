'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {addNode, changeConfigNode} from "@/lib/state/OSHSlice";
import {setLaneMap} from "@/lib/state/OSCARLaneSlice";
import {AppDispatch, RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {Node, NodeOptions} from "@/lib/data/osh/Node";
import {discoverLanesIncrementally} from "@/lib/data/oscar/LaneDiscovery";
import {parseOperationalView, withOperationalView} from "@/lib/data/oscar/OperationalView";



interface IDataSourceContext {
    laneMapRef: MutableRefObject<Map<string, LaneMapEntry>> | undefined;
    laneMapReady: boolean;
    readyLaneNames: ReadonlySet<string>;
    activeViewKey: string | null;
    viewError: "invalid" | "empty" | null;
    scopedHref: (path: string) => string;
}

// create context with a default value of undefined (This will differ if there is a file import at page load)
const DataSourceContext = createContext<IDataSourceContext | undefined>(undefined);

export {DataSourceContext};


export default function DataSourceProvider({children}: { children: ReactNode }) {

    const configNode = useSelector((state: RootState) => state.oshSlice.configNode);
    const dispatch = useAppDispatch();
    const nodes = useSelector((state: RootState) => state.oshSlice.nodes);
    const laneMapRef = useRef<Map<string, LaneMapEntry>>(new Map<string, LaneMapEntry>());
    const [laneMapReady, setLaneMapReady] = useState(false);
    const [readyLaneNames, setReadyLaneNames] = useState<Set<string>>(new Set());
    const [viewSelection, setViewSelection] = useState<{
        resolved: boolean;
        key: string | null;
        error: "invalid" | null;
    }>({resolved: false, key: null, error: null});
    const [viewError, setViewError] = useState<"invalid" | "empty" | null>(null);
    const discoveryGenerationRef = useRef(0);

    useEffect(() => {
        const selection = parseOperationalView(window.location.search);
        setViewSelection({resolved: true, ...selection});
    }, []);


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


    const testSysFetch = async (viewKey: string | null) => {
        const generation = ++discoveryGenerationRef.current;
        setLaneMapReady(false);
        setReadyLaneNames(new Set());
        laneMapRef.current = new Map();
        dispatch(setLaneMap(new Map()));

        const result = await discoverLanesIncrementally(nodes, (laneMap) => {
            if (generation !== discoveryGenerationRef.current)
                return;

            laneMapRef.current = laneMap;
            setReadyLaneNames(new Set(laneMap.keys()));
            dispatch(setLaneMap(laneMap));
        }, viewKey);

        if (generation !== discoveryGenerationRef.current)
            return;

        result.failures.forEach(({node, reason}) =>
            console.error(`Failed to initialize lane data for ${node.name}:`, reason));

        // Publish the final snapshot even when every node returned no lanes.
        laneMapRef.current = result.laneMap;
        setReadyLaneNames(new Set(result.laneMap.keys()));
        dispatch(setLaneMap(result.laneMap));
        setViewError(viewKey && result.laneMap.size === 0 ? "empty" : null);
        setLaneMapReady(true);
    }

    useEffect(() => {
        const init = async () => {
            if (!viewSelection.resolved)
                return;

            if (viewSelection.error) {
                discoveryGenerationRef.current++;
                laneMapRef.current = new Map();
                setReadyLaneNames(new Set());
                dispatch(setLaneMap(new Map()));
                setViewError("invalid");
                setLaneMapReady(true);
                return;
            }

            if (nodes.length === 0) {
                discoveryGenerationRef.current++;
                setLaneMapReady(false);
                setReadyLaneNames(new Set());
                return;
            }
            await InitializeApplication();
            await testSysFetch(viewSelection.key);
        }
        init();
    }, [nodes, viewSelection]);

    const scopedHref = useCallback(
        (path: string) => withOperationalView(
            path,
            viewSelection.error ? "__invalid__" : viewSelection.key,
        ),
        [viewSelection.key, viewSelection.error],
    );

    return (
        <DataSourceContext.Provider value={{
            laneMapRef,
            laneMapReady,
            readyLaneNames,
            activeViewKey: viewSelection.key,
            viewError,
            scopedHref,
        }}>
            {children}
        </DataSourceContext.Provider>
    );
};

export const initializeDefaultNode = () => (dispatch: AppDispatch) => {
    const hostName = window.location.hostname;
    const isSecure = window.location.protocol === "https:";
    let port: number;

    if (window.location.port) {
        port = Number(window.location.port);
    } else {
        port = isSecure ? 443 : 80;
    }

    const initialNodeOpts: NodeOptions = {
        name: "Local Node",
        address: hostName,
        port: port ? Number(port) : (isSecure ? 443 : 80),
        oshPathRoot: "/sensorhub",
        csAPIEndpoint: "/api",
        auth: { username: "", password: "" },
        authenticationMode: "session",
        isSecure: isSecure,
        isDefaultNode: true
    };

    const defaultNode = new Node(initialNodeOpts);
    dispatch(addNode(defaultNode));
    dispatch(changeConfigNode(defaultNode));
};
