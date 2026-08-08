"use client"

import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {LaneMapEntry, isMobileLane} from "@/lib/data/oscar/LaneCollection";
import {MapAlarmWindow, useMobileDetectors} from "@/app/_components/maps/useMobileDetectors";
import {LaneSelection} from "@/lib/layout/PageConfigTypes";
import {useLaneStreams} from "@/lib/data/oscar/streams/useLaneStreams";
import {LaneStreamRegistry} from "@/lib/data/oscar/streams/LaneStreamRegistry";
import {useStalenessSweep} from "@/lib/data/oscar/streams/useStalenessSweep";
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
const OFFLINE_COLOR = '#9e9e9e';

interface MapComponentProps {
    /** Widget config: restrict markers/streams to a lane subset. */
    laneFilter?: LaneSelection;
    /** Unique DOM id when several maps are on one page (default keeps the original id). */
    containerId?: string;
    /** Container height; the full map page uses the default 100vh. */
    height?: string | number;
    /** Live-track mobile detectors (RS350 backpack / Kromek D5). */
    showMobileUnits?: boolean;
    /** Breadcrumb trail behind each mobile detector. */
    showTrail?: boolean;
    /** Trail length in fixes (~1 per second). */
    trailLength?: number;
    /** Markers where mobile alarms occurred, colored by adjudication state. */
    showAlarmMarkers?: boolean;
    /** How far back to load historical mobile alarms. */
    alarmTimeWindow?: MapAlarmWindow;
}

export default function MapComponent({
    laneFilter, containerId, height = '100vh',
    showMobileUnits = true, showTrail = true, trailLength = 300,
    showAlarmMarkers = true, alarmTimeWindow = 'today',
}: MapComponentProps) {
    const mapcontainer: string = containerId ?? "mapcontainer";
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [isInit, setIsInit] = useState(false);
    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);
    const [dsLocations, setDsLocations] = useState([]);

    const laneSelection = useMemo<LaneSelection>(() => laneFilter ?? {mode: 'all'}, [JSON.stringify(laneFilter)]);
    const laneFilterSet = useMemo<Set<string> | null>(() => {
        if (laneSelection.mode === 'all') return null;
        return new Set(laneSelection.lanes);
    }, [laneSelection]);

    // Leaflet circleMarkers keyed by lane name, updated directly on alarm changes
    const markersByLane = useRef<Map<string, L.CircleMarker>>(new Map());
    const gammaAlarmByLane = useRef<Map<string, boolean>>(new Map());
    const neutronAlarmByLane = useRef<Map<string, boolean>>(new Map());
    const offlineByLane = useRef<Map<string, boolean>>(new Map());
    const markerLatLngs = useRef<L.LatLng[]>([]);
    const fitBoundsTimer = useRef<NodeJS.Timeout | null>(null);
    const hasSiteDiagram = useRef(false);

    const isLaneInAlarm = (laneName: string) =>
        (gammaAlarmByLane.current.get(laneName) ?? false) ||
        (neutronAlarmByLane.current.get(laneName) ?? false);

    // Alarm outranks offline: never visually downgrade an unacknowledged alarm
    // because comms went quiet — the Lane Status chip carries the comm failure
    // for the same lane. Offline = explicit device report OR comms silence.
    const markerFillColor = (laneName: string) =>
        isLaneInAlarm(laneName) ? ALARM_COLOR
            : (offlineByLane.current.get(laneName) || LaneStreamRegistry.isLaneStale(laneName)) ? OFFLINE_COLOR
                : NORMAL_COLOR;

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
                    if (laneFilterSet && !laneFilterSet.has(key)) return;
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

    }, [laneMap, dsLocations, laneFilterSet]);

    const datasourceSetup = useCallback(async () => {
        let locationDs: any[] = [];

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            if (laneFilterSet && !laneFilterSet.has(laneid)) continue;
            // Mobile detectors are tracked live by useMobileDetectors; keeping
            // them out of the batch path avoids replaying a 1 Hz location
            // history through PointMarkerLayer and freezing them as static dots
            if (isMobileLane(lane)) continue;
            for (let ds of lane.datastreams) {
                if (isLocationDataStream(ds)) {
                    locationDs.push(ds);
                }
            }
        }
        setDsLocations(locationDs);
    }, [laneMapRef, laneFilterSet]);

    const updateMarkerColor = (laneName: string) => {
        const marker = markersByLane.current.get(laneName);
        if (marker) {
            marker.setStyle({ fillColor: markerFillColor(laneName) });
        }
    };

    // Realtime alarm/connection status via the shared LaneStreamRegistry.
    useLaneStreams(laneSelection, ['connectionRT', 'gammaRT', 'neutronRT', 'tamperRT'], (laneName, stream, message) => {
        switch (stream) {
            case 'connectionRT': {
                const isConnected = message.values[0].data.isConnected;
                if (isConnected == undefined) return;
                offlineByLane.current.set(laneName, !isConnected);
                updateMarkerColor(laneName);
                updateLocationList(laneName, isConnected ? 'Online' : 'Offline');
                break;
            }
            case 'gammaRT': {
                const alarmstate = message.values[0].data.alarmState;
                gammaAlarmByLane.current.set(laneName, alarmstate === 'Alarm');
                updateMarkerColor(laneName);
                updateLocationList(laneName, alarmstate);
                break;
            }
            case 'neutronRT': {
                const alarmstate = message.values[0].data.alarmState;
                neutronAlarmByLane.current.set(laneName, alarmstate === 'Alarm');
                updateMarkerColor(laneName);
                updateLocationList(laneName, alarmstate);
                break;
            }
            case 'tamperRT': {
                const tamperState = message.values[0].data.tamperStatus;
                if (tamperState) {
                    updateLocationList(laneName, 'Tamper');
                }
                break;
            }
        }
    });

    // Comms staleness sweep: a stopped producer never reports Offline, so grey
    // out lanes silent past the threshold from message-arrival age. Fixed
    // lanes only — mobile walkers are restyled by useMobileDetectors.
    useStalenessSweep(() => {
        for (const laneName of markersByLane.current.keys()) {
            updateMarkerColor(laneName);
        }
    }, isInit);

    // Re-run whenever the lane map changes: on a fresh dashboard load this
    // component mounts before lane discovery finishes, so a one-shot setup
    // would capture an empty laneMapRef and the map would never get markers
    // (and never zoom in) until a remount.
    useEffect(() => {
        datasourceSetup();
    }, [datasourceSetup, laneMap]);

    // Mobile detectors: live moving markers + trails + alarm-location markers
    useMobileDetectors({
        enabled: isInit && showMobileUnits,
        showTrail,
        trailLength,
        showAlarmMarkers,
        alarmTimeWindow,
        laneFilterSet,
        getMap: () => leafletViewRef.current?.map ?? null,
        onFirstFix: (latlng) => {
            markerLatLngs.current.push(latlng);
            scheduleFitBounds();
        },
    });

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
                markersByLane.current.clear();
                markerLatLngs.current = [];
                hasSiteDiagram.current = false;
            }
        }
    }, [isInit]);

    // Keep Leaflet tiles in sync with container size (widget resize/drag).
    useEffect(() => {
        if (!isInit) return;
        const el = document.getElementById(mapcontainer);
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            leafletViewRef.current?.map?.invalidateSize();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isInit, mapcontainer]);

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
                                const cm = L.circleMarker(latlng, {
                                    radius: 10,
                                    fillColor: markerFillColor(location.laneName),
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
            id={mapcontainer}
            className="oscar-map-container"
            sx={{width: '100%', height: height}}
        />
    );
}
