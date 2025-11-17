"use client"

import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import Box from "@mui/material/Box";
import '../../style/map.css';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import { LaneWithLocation } from "types/new-types";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import "leaflet/dist/leaflet.css"
import {
    isGammaDataStream, isLocationDataStream,
    isNeutronDataStream, isSiteDiagramPathDataStream,
    isTamperDataStream
} from "@/lib/data/oscar/Utilities";
import {setCurrentLane} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import L from "leaflet";
import {selectNodes} from "@/lib/state/OSHSlice";
import {INode} from "@/lib/data/osh/Node";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import { convertToMap } from "@/app/utils/Utils";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter.js";


export default function MapComponent() {
    const mapcontainer: string = "mapcontainer";
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [isInit, setIsInt] = useState(false);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);
    const [dsLocations, setDsLocations] = useState([]);


    useEffect(() =>{
        if(locationList == null || locationList.length === 0 && laneMap.size > 0) {
            let locations: LaneWithLocation[] = [];

            const laneMapToMap = convertToMap(laneMap);

            laneMapToMap.forEach((value, key) => {
                if (laneMapToMap.has(key)) {
                    let ds: LaneMapEntry = laneMapToMap.get(key);

                    dsLocations.map((dss) => {
                        const locationSources = ds.datasourcesBatch.filter((item) =>
                            (item.properties.resource === ("/datastreams/" + dss.properties.id + "/observations")))

                        const laneWithLocation: LaneWithLocation = {
                            laneName: key,
                            locationSources: locationSources,
                            status: 'None',
                        };

                        locations.push(laneWithLocation);
                    });
                }
            });
            setLocationList(locations);
        }

    }, [laneMap, dsLocations]);

    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();
        let locationDs: any[] = [];

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];
                let batchDS = lane.datasourcesBatch[idx];
                let laneDSColl = laneDSMap.get(laneid);

                if (isLocationDataStream(ds)) {
                    laneDSColl.addDS('locBatch', batchDS);
                    locationDs.push(ds);
                }

                if (isGammaDataStream(ds)) {
                    laneDSColl.addDS('gammaRT', rtDS);
                }
                if (isNeutronDataStream(ds)) {
                    laneDSColl.addDS('neutronRT', rtDS);
                }
                if (isTamperDataStream(ds)) {
                    laneDSColl.addDS('tamperRT', rtDS);
                }
            }
            setDsLocations(locationDs);
            setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);


    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('connectionRT', (message: any) => {
                let connection = message.values[0].data.connection;
                updateLocationList(msgLaneName, connection);
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                let alarmstate = message.values[0].data.alarmState;
                updateLocationList(msgLaneName, alarmstate);
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                let alarmstate = message.values[0].data.alarmState;
                updateLocationList(msgLaneName, alarmstate);
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                let tamperState = message.values[0].data.tamperStatus;
                if (tamperState) {
                    updateLocationList(msgLaneName, 'Tamper');
                }
            });

            laneDSColl.addConnectToALLDSMatchingName("gammaRT");
            laneDSColl.addConnectToALLDSMatchingName("neutronRT");
            laneDSColl.addConnectToALLDSMatchingName("tamperRT");
            laneDSColl.addConnectToALLDSMatchingName("connectionRT");

        }

        return ()=> {
            for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
                laneDSColl.addDisconnectToALLDSMatchingName("gammaRT");
                laneDSColl.addDisconnectToALLDSMatchingName("neutronRT");
                laneDSColl.addDisconnectToALLDSMatchingName("tamperRT");
                laneDSColl.addDisconnectToALLDSMatchingName("connectionRT");

            }
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        if (locationList !== null && locationList.length > 0) {
            addSubscriptionCallbacks();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        if(!isInit)
            datasourceSetup();
    }, [isInit]);

    useEffect(() => {
        if (!leafletViewRef.current && !isInit) {
            let view = new LeafletView({
                container: mapcontainer,
                layers: [],
                imageOverlays: [],
                autoZoomOnFirstMarker: true
            });
            leafletViewRef.current = view;
            setIsInt(true);
        }

        return () =>{
            if(isInit && leafletViewRef.current != null){
                leafletViewRef.current.destroy();
                leafletViewRef.current = undefined;
            }
        }
    }, [isInit]);

    useEffect(() => {
        if(locationList && locationList.length > 0 && isInit){
            locationList.forEach((location) => {
                location.locationSources.forEach((loc: any) => {
                    let newPointMarker = new PointMarkerLayer({
                        name: location.laneName,
                        dataSourceId: loc.id,
                        getLocation: (rec: any) => {
                            return ({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt})
                        },
                        label: `<div class='popup-text-lane'>` + location.laneName + `</div>`,
                        markerId: () => this.getId(),
                        icon: '/default.svg',
                        iconColor: 'rgba(0,0,0,1.0)',
                        getIcon: {
                            dataSourceIds: [loc.getId()],
                            handler: function (rec: any) {
                                if (location.status === 'Alarm') {
                                    return  '/alarm.svg';
                                } else if (location.status.includes('Fault')) {
                                    return  '/fault.svg';
                                } else if(location.status === 'Offline') {
                                    return '/offline.svg'
                                } else {
                                    return '/default.svg'
                                }
                            }
                        },
                        labelColor: 'rgba(255,255,255,1.0)',
                        labelOutlineColor: 'rgba(0,0,0,1.0)',
                        labelSize: 20,
                        iconAnchor: [16, 16],
                        labelOffset: [-5, -15],
                        iconSize: [16, 16],
                        description: getContent(location.status, location.laneName),

                    });

                    leafletViewRef.current?.addLayer(newPointMarker);
                });
                location.locationSources.map((src: any) => src.connect());
            });
        }

        return () => {
            locationList.forEach((location) => {

                location.locationSources.map((src: any) =>{
                    if (src.isConnected()){
                        src.disconnect();
                    }
                });
            });
        }

    }, [locationList, isInit]);

    const getSiteDiagramPath = (path: string, node: INode) => {
        return node.isSecure ? `https://${node.address}:${node.port}${node.oshPathRoot}/buckets/${path}` : `http://${node.address}:${node.port}${node.oshPathRoot}/buckets/${path}`;
    }

    useEffect(() => {
        if (!leafletViewRef.current) {
            return;
        }
        const addImageOverlay = async (node: INode, path: string, urb: any, llb: any) => {

            const bounds = L.latLngBounds([llb, urb]);

            leafletViewRef.current.map.fitBounds(bounds);
            leafletViewRef.current.addImageOverlay(path, bounds, {
                opacity: 0.45,
                interactive: false,
                alt: `SiteMap for ${node.name}-${node.id}`,
            });

            leafletViewRef.current.map.invalidateSize();
        }

        nodes.forEach(async (node: INode) => {
            let path = node.siteMapPath;
            let llb = node.lowerLeftBound;
            let urb = node.upperRightBound;

            if (!path || !urb || !llb) {
                let oscarSystem = await node.getOscarServiceSystem();
                let oscarSystemDatastreams = [];
                if (!oscarSystem)
                    return;
                let dataStreamsCol = await oscarSystem.searchDataStreams(new DataStreamFilter({ validTime: "latest" }), 10);
                while (dataStreamsCol.hasNext()) {
                    const datastreamResults = await dataStreamsCol.nextPage();
                    oscarSystemDatastreams.push(...datastreamResults);
                }

                for (const ds of oscarSystemDatastreams) {
                    if (isSiteDiagramPathDataStream(ds)) {
                        let obsCollections = await ds.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);
                        let results = await obsCollections.nextPage();
                        let result = results[0];

                        if (result != undefined) {
                            path = getSiteDiagramPath(result.result.siteDiagramPath, node);
                            llb = [result.result.siteBoundingBox.lowerLeftBound.lon, result.result.siteBoundingBox.lowerLeftBound.lat]
                            urb = [result.result.siteBoundingBox.upperRightBound.lon, result.result.siteBoundingBox.upperRightBound.lat]
                            node.setSiteMapPath(path);
                            node.setLowerLeftBox(llb);
                            node.setUpperRightBox(urb);

                        }
                    } else {
                        console.warn("No sitemap, or bounds provided.")
                        return;
                    }
                }
            }

            addImageOverlay(node, path, urb, llb)
        })

    }, [isInit, nodes]);

    const updateLocationList = (laneName: string, newStatus: string) => {
        setLocationList((prevState) => {
            const updatedList = prevState.map((data) =>
                data.laneName === laneName ? {...data, status: newStatus} : data
            );

            return updatedList;
        });
    };

    /***************content in popup************/
    function getContent(status: string, laneName: string) {
        dispatch(setCurrentLane(laneName));

        return (
            `<div id='popup-data-layer' class='point-popup'><hr/>
                <h3 class='popup-text-status'>Status: ${status}</h3>
                <button onClick='location.href="/lane-view"' class="popup-button" type="button">VIEW LANE</button>
            </div>`
        );
    }

    return (
        <Box
            id="mapcontainer"
            style={{width: '100%', height: '1200px'}}
        />
    );
}