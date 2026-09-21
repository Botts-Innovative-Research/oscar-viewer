"use client"

import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {LaneDSColl} from "@/lib/data/oscar/LaneCollection";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import Box from "@mui/material/Box";
import '../../style/map.css';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import "leaflet/dist/leaflet.css"
import {
    isConnectionDataStream, isGammaDataStream, isLocationDataStream,
    isNeutronDataStream, isSiteDiagramPathDataStream,
    isTamperDataStream
} from "@/lib/data/oscar/Utilities";
import {setCurrentLane} from "@/lib/state/LaneViewSlice";
import {useAppDispatch} from "@/lib/state/Hooks";
import L from "leaflet";
import {selectNodes} from "@/lib/state/OSHSlice";
import {INode} from "@/lib/data/osh/Node";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import DataStreamFilter from "osh-js/source/core/consysapi/datastream/DataStreamFilter.js";
import {useLanguage} from '@/app/contexts/LanguageContext';
import {
    buildSiteDiagramUrl,
    LANE_MARKER_PANE,
    LANE_MARKER_PANE_Z_INDEX,
    LaneMapLocation,
    OSM_TILE_URL,
    SITE_DIAGRAM_FIT_OPTIONS,
    SITE_DIAGRAM_PANE,
    SITE_DIAGRAM_PANE_Z_INDEX,
    SiteDiagramBounds,
    toLaneMapLocation,
    toLaneMapLocationFromSystem,
    toLeafletSiteDiagramBounds,
} from "@/app/_components/maps/MapUtils";

interface LaneMarkerState {
    laneName: string;
    location: LaneMapLocation;
    status: string;
}


export default function MapComponent() {
    const {language, t} = useLanguage();
    const mapcontainer: string = "mapcontainer";
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const siteDiagramLayersRef = useRef<Map<string, L.ImageOverlay>>(new Map());
    const laneMarkerLayersRef = useRef<Map<string, L.Marker>>(new Map());
    const previousLanguageRef = useRef(language);
    const {laneMapReady} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [isInit, setIsInit] = useState(false);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const [locationList, setLocationList] = useState<LaneMarkerState[]>([]);

    useEffect(() => {
        if (!laneMapReady) return;

        let cancelled = false;
        const laneDSMap = new Map<string, LaneDSColl>();
        const locationSources: Array<{
            laneName: string;
            dataStream: any | null;
            systemLocation: LaneMapLocation | null;
        }> = [];

        for (const [laneName, lane] of laneMap.entries()) {
            const laneDSColl = new LaneDSColl();
            laneDSMap.set(laneName, laneDSColl);

            const laneSystemId = lane.laneSystem?.properties?.id;
            const locationStreams: any[] = [];

            lane.datastreams.forEach((dataStream, index) => {
                const realtimeSource = lane.datasourcesRealtime[index];

                if (isLocationDataStream(dataStream))
                    locationStreams.push(dataStream);
                if (realtimeSource && isGammaDataStream(dataStream))
                    laneDSColl.addDS('gammaRT', realtimeSource);
                if (realtimeSource && isNeutronDataStream(dataStream))
                    laneDSColl.addDS('neutronRT', realtimeSource);
                if (realtimeSource && isTamperDataStream(dataStream))
                    laneDSColl.addDS('tamperRT', realtimeSource);
                if (realtimeSource && isConnectionDataStream(dataStream))
                    laneDSColl.addDS('connectionRT', realtimeSource);
            });

            const laneLocationStream = locationStreams.find((dataStream) =>
                dataStream?.properties?.["system@id"] === laneSystemId) ?? locationStreams[0] ?? null;
            locationSources.push({
                laneName,
                dataStream: laneLocationStream,
                systemLocation: toLaneMapLocationFromSystem(lane.laneSystem),
            });
        }
        setDataSourcesByLane(laneDSMap);

        const loadLatestLocations = async () => {
            const markers = await Promise.all(locationSources.map(async ({laneName, dataStream, systemLocation}) => {
                if (!dataStream) {
                    if (!systemLocation)
                        console.warn(`No configured location is available for lane ${laneName}`);
                    return systemLocation
                        ? {laneName, location: systemLocation, status: 'None'} as LaneMarkerState
                        : null;
                }

                try {
                    const observations = await dataStream.searchObservations(
                        new ObservationFilter({resultTime: "latest"}), 1);
                    const results = await observations.nextPage();
                    const location = toLaneMapLocation(results[0]?.result) ?? systemLocation;
                    if (!location) {
                        console.warn(`No valid latest location is available for lane ${laneName}`);
                        return null;
                    }
                    return {laneName, location, status: 'None'} as LaneMarkerState;
                } catch (error) {
                    console.error(`Unable to load the latest location for lane ${laneName}`, error);
                    return systemLocation
                        ? {laneName, location: systemLocation, status: 'None'} as LaneMarkerState
                        : null;
                }
            }));

            if (cancelled) return;
            setLocationList((current) => markers
                .filter((marker): marker is LaneMarkerState => marker !== null)
                .map((marker) => ({
                    ...marker,
                    status: current.find((item) => item.laneName === marker.laneName)?.status ?? marker.status,
                })));
        };

        void loadLatestLocations();
        return () => {
            cancelled = true;
        };
    }, [laneMap, laneMapReady]);


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
        if (dataSourcesByLane.size === 0) return;
        return addSubscriptionCallbacks();
    }, [addSubscriptionCallbacks, dataSourcesByLane]);

    useEffect(() => {
        if (!leafletViewRef.current && !isInit) {
            // define base layers

            const osmLayer = L.tileLayer(OSM_TILE_URL, {
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                minZoom: 1,
                maxZoom: 22,
                maxNativeZoom: 19,
                referrerPolicy: "strict-origin-when-cross-origin",
            });
            const esriLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
                attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                maxZoom: 22,
                maxNativeZoom: 19,
                referrerPolicy: "strict-origin-when-cross-origin"
            });

            let view = new LeafletView({
                container: mapcontainer,
                layers: [],
                imageOverlays: [],
                autoZoomOnFirstMarker: true,
                baseLayers:{
                    [t('osmStreets')]: osmLayer,
                    [t('esriSatellite')]: esriLayer
                },
                overlayLayers: {},
                defaultLayer: osmLayer
            });
            view.map.options.zoomSnap = 0;
            const siteDiagramPane = view.map.createPane(SITE_DIAGRAM_PANE);
            siteDiagramPane.style.zIndex = String(SITE_DIAGRAM_PANE_Z_INDEX);
            siteDiagramPane.style.pointerEvents = "none";
            const laneMarkerPane = view.map.createPane(LANE_MARKER_PANE);
            laneMarkerPane.style.zIndex = String(LANE_MARKER_PANE_Z_INDEX);

            // LeafletView accepts a default layer, but explicitly enforce OSM
            // here so an empty map never depends on the layer-control state.
            if (!view.map.hasLayer(osmLayer))
                osmLayer.addTo(view.map);

            leafletViewRef.current = view;
            setIsInit(true);
        }

        return () =>{
            if(isInit && leafletViewRef.current != null){
                siteDiagramLayersRef.current.clear();
                laneMarkerLayersRef.current.clear();
                leafletViewRef.current.destroy();
                leafletViewRef.current = undefined;
            }
        }
    }, [isInit]);

    useEffect(() => {
        if (previousLanguageRef.current === language) return;
        previousLanguageRef.current = language;

        if (leafletViewRef.current) {
            siteDiagramLayersRef.current.clear();
            laneMarkerLayersRef.current.clear();
            leafletViewRef.current.destroy();
            leafletViewRef.current = null;
            setIsInit(false);
        }
    }, [language]);

    useEffect(() => {
        const view = leafletViewRef.current;
        if (!view || !isInit) return;

        const renderedLaneNames = new Set<string>();
        locationList.forEach(({laneName, location, status}) => {
            renderedLaneNames.add(laneName);
            const iconPath = getMarkerIcon(status);
            const markerIcon = L.icon({
                iconUrl: iconPath,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
            });
            let marker = laneMarkerLayersRef.current.get(laneName);

            if (!marker) {
                marker = L.marker([location.lat, location.lon], {
                    icon: markerIcon,
                    pane: LANE_MARKER_PANE,
                    zIndexOffset: 1000,
                    title: laneName,
                    alt: laneName,
                }).addTo(view.map);
                marker.bindTooltip(`<div class='popup-text-lane'>${laneName}</div>`, {
                    direction: 'center',
                    offset: L.point(-5, -15),
                });
                marker.on('click', () => dispatch(setCurrentLane(laneName)));
                laneMarkerLayersRef.current.set(laneName, marker);
            } else {
                marker.setLatLng([location.lat, location.lon]);
                marker.setIcon(markerIcon);
            }

            if (marker.getPopup())
                marker.setPopupContent(getContent(status));
            else
                marker.bindPopup(getContent(status), {offset: L.point(-5, -15)});
        });

        laneMarkerLayersRef.current.forEach((marker, laneName) => {
            if (!renderedLaneNames.has(laneName)) {
                view.map.removeLayer(marker);
                laneMarkerLayersRef.current.delete(laneName);
            }
        });
    }, [locationList, isInit, language, t]);

    useEffect(() => {
        const view = leafletViewRef.current;
        if (!view || !isInit || !laneMapReady) {
            return;
        }

        let cancelled = false;
        let fitFrameId: number | null = null;

        type LoadedSiteDiagram = {
            node: INode,
            path: string,
            bounds: SiteDiagramBounds,
        };

        const loadSiteDiagram = async (node: INode): Promise<LoadedSiteDiagram | null> => {
            const oscarSystem = node.getOscarServiceSystem();
            if (!oscarSystem)
                return null;

            const oscarSystemDatastreams = [];
            const dataStreamsCol = await oscarSystem.searchDataStreams(
                new DataStreamFilter({validTime: "latest"}), 10);
            while (dataStreamsCol.hasNext()) {
                const datastreamResults = await dataStreamsCol.nextPage();
                oscarSystemDatastreams.push(...datastreamResults);
            }

            const siteDiagramStream = oscarSystemDatastreams.find(isSiteDiagramPathDataStream);
            if (!siteDiagramStream)
                return null;

            const observations = await siteDiagramStream.searchObservations(
                new ObservationFilter({resultTime: "latest"}), 1);
            const results = await observations.nextPage();
            const siteDiagram = results[0]?.result;
            if (!siteDiagram?.siteDiagramPath)
                return null;

            const bounds = toLeafletSiteDiagramBounds(siteDiagram.siteBoundingBox);
            if (!bounds) {
                console.warn(`Invalid site diagram bounds for ${node.name}`, siteDiagram.siteBoundingBox);
                return null;
            }

            const path = buildSiteDiagramUrl(siteDiagram.siteDiagramPath, node);
            node.setSiteMapPath(path);
            node.setLowerLeftBox(bounds[0]);
            node.setUpperRightBox(bounds[1]);
            return {node, path, bounds};
        };

        const renderSiteDiagrams = async () => {
            const diagramResults: Array<LoadedSiteDiagram | null> = await Promise.all(
                (nodes as INode[]).map(async (node: INode) => {
                    try {
                        return await loadSiteDiagram(node);
                    } catch (error) {
                        console.error(`Unable to load the site diagram for ${node.name}`, error);
                        return null;
                    }
                }));
            const diagrams: LoadedSiteDiagram[] = diagramResults.filter(
                (diagram): diagram is LoadedSiteDiagram => diagram !== null);

            if (cancelled || leafletViewRef.current !== view)
                return;

            siteDiagramLayersRef.current.forEach((layer) => view.map.removeLayer(layer));
            siteDiagramLayersRef.current.clear();

            const combinedBounds = L.latLngBounds([]);
            diagrams.forEach(({node, path, bounds}: LoadedSiteDiagram) => {
                const leafletBounds = L.latLngBounds(bounds);
                const overlay = view.addImageOverlay(path, leafletBounds, {
                    opacity: 0.85,
                    interactive: false,
                    pane: SITE_DIAGRAM_PANE,
                    alt: t('siteMapForNode', {name: node.name, id: node.id}),
                }) as L.ImageOverlay;

                overlay.on("load", () => overlay.bringToFront());
                overlay.on("error", () => console.error(`Unable to render the site diagram for ${node.name}: ${path}`));
                overlay.bringToFront();
                siteDiagramLayersRef.current.set(node.id, overlay);
                combinedBounds.extend(leafletBounds);
            });

            if (diagrams.length > 0) {
                view.autoZoomOnFirstMarker = false;
                // Wait for the dashboard grid to finish laying out the map.
                // Leaflet then computes the tightest fractional zoom that
                // contains the exact uploaded lower-left/upper-right extent.
                fitFrameId = window.requestAnimationFrame(() => {
                    if (cancelled || leafletViewRef.current !== view)
                        return;

                    view.map.invalidateSize({pan: false, animate: false});
                    view.map.fitBounds(combinedBounds, SITE_DIAGRAM_FIT_OPTIONS);
                });
            }
        };

        void renderSiteDiagrams();
        return () => {
            cancelled = true;
            if (fitFrameId !== null)
                window.cancelAnimationFrame(fitFrameId);
        };
    }, [isInit, laneMap, laneMapReady, nodes, language]);

    const updateLocationList = (laneName: string, newStatus: string) => {
        setLocationList((prevState) => {
            const updatedList = prevState.map((data) =>
                data.laneName === laneName ? {...data, status: newStatus} : data
            );

            return updatedList;
        });
    };

    function getMarkerIcon(status: string) {
        const normalizedStatus = typeof status === 'string' ? status : '';
        if (normalizedStatus === 'Alarm') return '/alarm.svg';
        if (normalizedStatus.includes('Fault')) return '/fault.svg';
        if (normalizedStatus === 'Offline') return '/offline.svg';
        return '/default.svg';
    }

    /***************content in popup************/
    function getContent(status: string) {
        const normalizedStatus = typeof status === 'string' && status ? status : 'None';
        const statusKey = normalizedStatus.toLowerCase().replace(/[ -]/g, '');

        return (
            `<div id='popup-data-layer' class='point-popup'><hr/>
                <h3 class='popup-text-status'>${t('statusValue', {status: t(`status.${statusKey}`)})}</h3>
                <button onClick='location.href="/lane-view"' class="popup-button" type="button">${t('viewLane')}</button>
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
