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
import {isGammaDatastream, isNeutronDatastream, isTamperDatastream} from "@/lib/data/oscar/Utilities";


export default function MapComponent() {

    const leafletViewRef = useRef<typeof LeafletView | null>(null);
    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);
    const mapcontainer: string = "mapcontainer";

    const [isInit, setIsInt] = useState(false);

    const {laneMapRef} = useContext(DataSourceContext);
    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [dsLocations, setDsLocations] = useState([]);

    const convertToMap = (obj: any) =>{
        if(!obj) return new Map();
        if(obj instanceof Map) return obj;
        return new Map(Object.entries(obj));
    }


    useEffect(() =>{
        if(locationList == null || locationList.length === 0 && laneMap.size > 0) {
            let locations: LaneWithLocation[] = [];

            const laneMapToMap = convertToMap(laneMap);

            laneMapToMap.forEach((value, key) => {
                if (laneMapToMap.has(key)) {
                    let ds: LaneMapEntry = laneMapToMap.get(key);

                    dsLocations.map((dss) => {
                        const locationSources = ds.datasourcesBatch.filter((item) => (item.properties.resource === ("/datastreams/" + dss.properties.id + "/observations")))

                        const laneWithLocation: LaneWithLocation = {
                            laneName: key,
                            locationSources: locationSources,
                            status: 'None',
                        };

                        locations.push(laneWithLocation);

                        }
                    )
                }
            });
            setLocationList(locations);
        }
    },[laneMap, dsLocations]);

    /*****************lane status datasources******************/
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

                if (ds.properties.observedProperties[0].definition.includes("http://www.opengis.net/def/property/OGC/0/SensorLocation") && !ds.properties.name.includes('Rapiscan') || ds.properties.observedProperties[0].definition.includes('http://sensorml.com/ont/swe/property/LocationVector')) {
                    laneDSColl.addDS('locBatch', batchDS);
                    locationDs.push(ds);
                }

                if (isGammaDatastream(ds)) {
                    laneDSColl.addDS('gammaRT', rtDS);
                }
                if (isNeutronDatastream(ds)) {
                    laneDSColl.addDS('neutronRT', rtDS);
                }
                if (isTamperDatastream(ds)) {
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

            laneDSColl.connectAllDS();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        if (locationList !== null && locationList.length > 0) {
            addSubscriptionCallbacks();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);


    useEffect(() => {

        if (!leafletViewRef.current && !isInit) {
            let view = new LeafletView({
                container: mapcontainer,
                layers: [],

                autoZoomOnFirstMarker: true
            });
            leafletViewRef.current = view;
            setIsInt(true);
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
                                } else{
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

    }, [locationList, isInit]);

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

        return (
            `<div id='popup-data-layer' class='point-popup'><hr/>
                <h3 class='popup-text-status'>Status: ${status}</h3>
                <button onClick='location.href="./lane-view?name=${laneName}"' class="popup-button" type="button">VIEW LANE</button>
            </div>`
        );
    }

    return (
        <Box id="mapcontainer" style={{width: '100%', height: '1200px'}}></Box>
    );
}