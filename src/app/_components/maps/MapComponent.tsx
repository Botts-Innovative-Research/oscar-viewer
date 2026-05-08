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

const ALARM_COLOR = '#d32f2f';
const NORMAL_COLOR = '#2e7d32';

export default function MapComponent() {
    const mapcontainer: string = "mapcontainer";
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [isInit, setIsInit] = useState(false);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);
    const [dsLocations, setDsLocations] = useState([]);

    // Leaflet circleMarkers keyed by lane name, updated directly on alarm changes
    const markersByLane = useRef<Map<string, L.CircleMarker>>(new Map());
    const gammaAlarmByLane = useRef<Map<string, boolean>>(new Map());
    const neutronAlarmByLane = useRef<Map<string, boolean>>(new Map());
    const markerLatLngs = useRef<L.LatLng[]>([]);
    const fitBoundsTimer = useRef<NodeJS.Timeout | null>(null);
    const hasSiteDiagram = useRef(false);
    const subscriptionsSetUp = useRef(false);

    const isLaneInAlarm = (laneName: string) =>
        (gammaAlarmByLane.current.get(laneName) ?? false) ||
        (neutronAlarmByLane.current.get(laneName) ?? false);

    const scheduleFitBounds = useCallback(() => {
        if (hasSiteDiagram.current) return;
        if (fitBoundsTimer.current) clearTimeout(fitBoundsTimer.current);
        fitBoundsTimer.current = setTimeout(() => {
            if (markerLatLngs.current.length > 0 && leafletViewRef.current?.map) {
                leafletViewRef.current.map.fitBounds(
                    L.latLngBounds(markerLatLngs.current),
                    { padding: [50, 50], maxZoom: 16 }
                );
            }
        }, 800);
    }, []);

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

    const updateMarkerColor = (laneName: string) => {
        const marker = markersByLane.current.get(laneName);
        if (marker) {
            marker.setStyle({ fillColor: isLaneInAlarm(laneName) ? ALARM_COLOR : NORMAL_COLOR });
        }
    };

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('connectionRT', (message: any) => {
                let connection = message.values[0].data.connection;
                updateLocationList(msgLaneName, connection);
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) => {
                let alarmstate = message.values[0].data.alarmState;
                gammaAlarmByLane.current.set(msgLaneName, alarmstate === 'Alarm');
                updateMarkerColor(msgLaneName);
                updateLocationList(msgLaneName, alarmstate);
            });

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) => {
                let alarmstate = message.values[0].data.alarmState;
                neutronAlarmByLane.current.set(msgLaneName, alarmstate === 'Alarm');
                updateMarkerColor(msgLaneName);
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
        if (locationList !== null && locationList.length > 0 && dataSourcesByLane.size > 0 && !subscriptionsSetUp.current) {
            addSubscriptionCallbacks();
            subscriptionsSetUp.current = true;
        }
    }, [dataSourcesByLane, locationList]);

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
                autoZoomOnFirstMarker: false,
            });
            leafletViewRef.current = view;
            setIsInit(true);
        }

        return () =>{
            if(isInit && leafletViewRef.current != null){
                leafletViewRef.current.destroy();
                leafletViewRef.current = undefined;
            }
        }
    }, [isInit]);

    useEffect(() => {
        if (locationList && locationList.length > 0 && isInit) {
            locationList.forEach((location) => {
                // Skip lanes that already have a marker created
                if (markersByLane.current.has(location.laneName)) return;

                location.locationSources.forEach((loc: any) => {
                    let newPointMarker = new PointMarkerLayer({
                        name: location.laneName,
                        dataSourceId: loc.id,
                        getLocation: (rec: any) => {
                            const lat = rec.location.lat;
                            const lon = rec.location.lon;
                            const latlng = L.latLng(lat, lon);

                            // Create a Leaflet circleMarker the first time location data arrives
                            if (!markersByLane.current.has(location.laneName) && leafletViewRef.current?.map) {
                                const isAlarm = isLaneInAlarm(location.laneName);
                                const cm = L.circleMarker(latlng, {
                                    radius: 10,
                                    fillColor: isAlarm ? ALARM_COLOR : NORMAL_COLOR,
                                    color: '#ffffff',
                                    weight: 2,
                                    opacity: 1,
                                    fillOpacity: 0.9,
                                }).addTo(leafletViewRef.current.map);

                                cm.bindPopup(
                                    `<div class='point-popup'>
                                        <strong>${location.laneName}</strong>
                                        <hr/>
                                        <button onclick='location.href="/lane-view"' class="popup-button" type="button">VIEW LANE</button>
                                    </div>`
                                );
                                cm.on('click', () => dispatch(setCurrentLane(location.laneName)));

                                markersByLane.current.set(location.laneName, cm);
                                markerLatLngs.current.push(latlng);
                                scheduleFitBounds();
                            }

                            return { x: lon, y: lat, z: rec.location.alt };
                        },
                        // Hidden icon — circleMarker above handles the visual
                        label: '',
                        markerId: () => this.getId(),
                        icon: '/transparent.svg',
                        iconSize: [1, 1],
                        iconAnchor: [0, 0],
                        labelSize: 1,
                    });

                    leafletViewRef.current?.addLayer(newPointMarker);
                });
                location.locationSources.map((src: any) => src.connect());
            });
        }

        return () => {
            if (locationList && locationList.length > 0) {
                locationList.forEach((location) => {
                    // location.locationSources.map((src: any) => { if (src.isConnected()) src.disconnect(); });
                });
            }
        }

    }, [locationList, isInit]);

    const getSiteDiagramPath = (path: string, node: INode) => {
        return node.isSecure ? `https://${node.address}:${node.port}${node.oshPathRoot}/buckets/${path}` : `http://${node.address}:${node.port}${node.oshPathRoot}/buckets/${path}`;
    }

    useEffect(() => {
        if (!leafletViewRef.current || !isInit) {
            return;
        }

        const addImageOverlay = async (node: INode, path: string, urb: any, llb: any) => {
            const bounds = L.latLngBounds([llb, urb]);

            hasSiteDiagram.current = true;
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
                        console.info("No sitemap or bounds provided for " + node.name)
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

    function getContent(status: string, laneName: string) {
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
            sx={{width: '100%', height: '100vh'}}
        />
    );
}
