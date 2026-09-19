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
import {useLanguage} from '@/app/contexts/LanguageContext';
import {
    buildSiteDiagramUrl,
    OSM_TILE_URL,
    SITE_DIAGRAM_FIT_OPTIONS,
    SITE_DIAGRAM_PANE,
    SITE_DIAGRAM_PANE_Z_INDEX,
    SiteDiagramBounds,
    toLeafletSiteDiagramBounds,
} from "@/app/_components/maps/MapUtils";


export default function MapComponent() {
    const {language, t} = useLanguage();
    const mapcontainer: string = "mapcontainer";
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));
    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const siteDiagramLayersRef = useRef<Map<string, L.ImageOverlay>>(new Map());
    const previousLanguageRef = useRef(language);
    const {laneMapRef, laneMapReady} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();

    const nodes = useSelector((state: RootState) => selectNodes(state));

    const [isInit, setIsInit] = useState(false);
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
                leafletViewRef.current.destroy();
                leafletViewRef.current = undefined;
            }
        }
    }, [isInit]);

    useEffect(() => {
        if (previousLanguageRef.current === language) return;
        previousLanguageRef.current = language;

        if (leafletViewRef.current) {
            leafletViewRef.current.destroy();
            leafletViewRef.current = null;
            setIsInit(false);
        }
    }, [language]);

    useEffect(() => {
        if (locationList && locationList.length > 0 && isInit) {
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
            if (locationList && locationList.length > 0) {
                locationList.forEach((location) => {

                    // location.locationSources.map((src: any) =>{
                    //     if (src.isConnected()){
                    //         src.disconnect();
                    //     }
                    // });
                });
            }
        }

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
    }, [isInit, laneMapReady, nodes, language]);

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
        const statusKey = status.toLowerCase().replace(/[ -]/g, '');

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
