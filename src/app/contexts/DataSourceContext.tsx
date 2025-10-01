'use client';

import React, {createContext, MutableRefObject, ReactNode, useCallback, useEffect, useRef} from "react";
import {useSelector} from "react-redux";
import {useAppDispatch} from "@/lib/state/Hooks";
import {addNode, changeConfigNode, setNodes} from "@/lib/state/OSHSlice";
import {setLaneMap} from "@/lib/state/OSCARLaneSlice";
import {AppDispatch, RootState} from "@/lib/state/Store";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {INode, Node, NodeOptions} from "@/lib/data/osh/Node";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ConfigData, {retrieveLatestConfigDataStream} from "@/lib/data/oscar/Config";


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
        dispatch(initializeDefaultNode());
    }, []);


    const handleLoadState = async () => {

        let latestConfigDs = await retrieveLatestConfigDataStream(configNode);

        if (latestConfigDs) {

            let latestConfigData = await fetchLatestConfigObservation(latestConfigDs);

            if(latestConfigData != null){
                let nodes = latestConfigData.nodes;


                nodes = nodes.map((node: any)=>{
                    return new Node(
                        {
                            name: node.name,
                            address: node.address,
                            port: node.port,
                            oshPathRoot: node.oshPathRoot,
                            csAPIEndpoint: node.csAPIEndpoint,
                            auth: { username: node.username, password: node.password },
                            isSecure: node.isSecure,
                            isDefaultNode: node.isDefaultNode
                        }
                    )
                })

                dispatch(setNodes(nodes));
            }else{
                console.warn("Failed to Load Oscar State: latest observation from config data is null")
            }

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
        else{
            console.log("Config Node found: Loading state...")
            await handleLoadState();
        }
    }, [nodes.length]);

    const fetchLatestConfigObservation = async(ds: any) =>{
        const observations = await ds.searchObservations(new ObservationFilter({ resultTime: 'latest'}), 1);

        let obsResult = await observations.nextPage();

        if(!obsResult) return;

        let configData = obsResult.map((obs: any) =>{
            let data = new ConfigData(obs.phenomenonTime, obs.id, obs.result.user, obs.result.nodes, obs.result.numNodes)
            return data;
        })

        return configData[0];
    }

    function mapNodeFromConfig(opt: any): Node{
        return new Node({
            name: opt.name,
            address: opt.address,
            port: opt.port,
            oshPathRoot: opt.oshPathRoot,
            csAPIEndpoint: opt.csAPIEndpoint,
            auth: {
                username: opt?.auth?.username ? opt.auth.username : opt.username,
                password: opt?.auth?.password ? opt.auth.password : opt.password,
            },
            isSecure: opt.isSecure,
            isDefaultNode: opt.isDefaultNode,
            laneAdjMap: opt.laneAdjMap,
            oscarServiceSystem: opt.oscarServiceSystem
        });
    }

    const testSysFetch = async () => {

        let newNodes = nodes.map(mapNodeFromConfig);

        let allLanes: Map<string, LaneMapEntry> = new Map();

        await Promise.all(newNodes.map(async (node: INode) => {

            //COMMENT THIS LINE OUT WHEN TESTING IN DEV MODE
            await node.authFileServer();

            let nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();

            if(!nodeLaneMap) return;
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


            nodeLaneMap.forEach((value: LaneMapEntry, key: string) =>{
                allLanes.set(key,value);
            })
        }));


        // fetch adjudication systems
        // let adjMap: Map<string, string> = new Map();
        // for(let node of newNodes){
        //    adjMap = await node.fetchOrCreateAdjudicationSystems(allLanes);
        //
        // }

        // dispatch(setDatastreams(allDatastreams));
        dispatch(setLaneMap(allLanes));
        laneMapRef.current = allLanes;

    }



    useEffect(() => {
        const init = async () => {
            await InitializeApplication();
            await testSysFetch();
        }

        init();
    }, [nodes.length]);


    return (
        <>
            <DataSourceContext.Provider value={{laneMapRef}}>
                {children}
            </DataSourceContext.Provider>
        </>
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