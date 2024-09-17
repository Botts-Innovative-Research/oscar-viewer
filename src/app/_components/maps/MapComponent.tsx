"use client"

import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import Box from "@mui/material/Box";
import './Map.css';
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import { LaneWithLocation, LaneWithVideo } from "types/new-types";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import "leaflet/dist/leaflet.css"
import L, {Popup} from "leaflet";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";

export default function MapComponent(){

    const mapViewRef = useRef< typeof LeafletView | null>(null);
    let pointMarkers: any[] = [];

    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);

    /****global datasource references***/
    const {laneMapRef} = useContext(DataSourceContext);
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    /******************location & video datasource********************/
    useEffect(() =>{
        if(locationList == null || locationList.length === 0 && laneMap.size > 0) {
            let locations: LaneWithLocation[] = [];
            laneMap.forEach((value, key) => {
                if (laneMap.has(key)) {
                    let ds: LaneMapEntry = laneMap.get(key);
                    const locationSources = ds.datasourcesBatch.filter((item) => item.name.includes('Sensor Location') && item.name.includes('Lane'));
                    const videoSources = ds.datasourcesRealtime.filter((item) => item.name.includes('Video') && item.name.includes('Lane'));

                    const laneWithLocation: LaneWithLocation = {
                        laneName: key,
                        locationSources: locationSources,
                        videoSources: videoSources,
                        status: 'None',
                    };

                    locations.push(laneWithLocation);
                }
            });
            setLocationList(locations);
        }
    },[laneMap]);

    /*****************lane status datasources******************/
    const datasourceSetup = useCallback(async () => {
        // @ts-ignore
        let laneDSMap = new Map<string, LaneDSColl>();

        for (let [laneid, lane] of laneMapRef.current.entries()) {
            laneDSMap.set(laneid, new LaneDSColl());
            for (let ds of lane.datastreams) {

                let idx: number = lane.datastreams.indexOf(ds);
                let rtDS = lane.datasourcesRealtime[idx];
                let laneDSColl = laneDSMap.get(laneid);

                if (ds.properties.name.includes('Driver - Gamma Count')) {
                    laneDSColl.addDS('gammaRT', rtDS);
                }

                if (ds.properties.name.includes('Driver - Neutron Count')) {
                    laneDSColl.addDS('neutronRT', rtDS);
                }

                if (ds.properties.name.includes('Driver - Tamper')) {
                    laneDSColl.addDS('tamperRT', rtDS);
                }
            }
            // setDataSourcesByLane(laneDSMap);
        }
    }, [laneMapRef.current]);

    useEffect(() => {
        datasourceSetup();
    }, [laneMapRef.current]);


    useEffect(() => {
        if(locationList !== null) {
            let popup: Popup | null = null;

            locationList.forEach((location) => {
                location.locationSources.map((loc) => {

                    let newPointMarker = new PointMarkerLayer({
                        dataSourceId: loc.id,
                        getLocation: (rec: any) => ({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
                        label: location.laneName,
                        markerId: () => this.getId(),
                        icon: '/circle.svg',
                        iconAnchor: [16, 16],
                        labelOffset: [-5, -15],
                        iconSize: [16, 16],

                        onLeftClick: (markerId: any, markerObject: any, layer: any, event: any) =>{
                            popup = L.popup({offset: [0, -16]})
                                .setLatLng(event.latlng)
                                .setContent(getContent(location.laneName, location.status))
                                .openOn(markerObject._map);

                            let videoView = new VideoView({
                                container: "popup-data-layer",
                                layers: [
                                    new VideoDataLayer({
                                        dataSourceId: loc.videoSources[0].id,
                                        getFrameData: (rec: any) => rec.videoFrame,
                                        getTimestamp: (rec: any) => rec.timestamp
                                    })
                                ]
                            });
                            popup.on("remove", function() {
                                popup= null;
                                videoView.destroy();
                            });
                        }
                    });
                    pointMarkers.push(newPointMarker);
                });

            });


            if (!mapViewRef.current) {
                mapViewRef.current = new LeafletView({
                    container: "mapcontainer",
                    layers: pointMarkers,
                    autoZoomOnFirstMarker: true,
                });
            }

            locationList.map((location) => {
                location.locationSources.map((src) => src.connect());
                location.videoSources.map((src) => src.connect());
            });
        }

        return () => {
            if (mapViewRef.current) {
                mapViewRef.current.destroy();
                mapViewRef.current = null;
            }
        }
    }, [locationList]);

    const addSubscriptionCallbacks = useCallback(() => {
        for (let [laneName, laneDSColl] of dataSourcesByLane.entries()) {
            const msgLaneName = laneName;

            laneDSColl.addSubscribeHandlerToALLDSMatchingName('gammaRT', (message: any) =>{
                let alarmstate = message.values[0].data.alarmState;
                // updateLocationList(msgLaneName, alarmstate);

                locationList.filter((list) => (list.status !== alarmstate && list.laneName === msgLaneName) ? updateLocationList(msgLaneName, alarmstate) : locationList)
            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('neutronRT', (message: any) =>{
                let alarmstate = message.values[0].data.alarmState;
                // updateLocationList(msgLaneName, alarmstate);
                locationList.filter((list) => (list.status !== alarmstate && list.laneName === msgLaneName) ? updateLocationList(msgLaneName, alarmstate) : locationList)

            });
            laneDSColl.addSubscribeHandlerToALLDSMatchingName('tamperRT', (message: any) => {
                let tamperState = message.values[0].data.tamperState;

                if(tamperState){
                    updateLocationList(msgLaneName, 'Tamper');
                }else{
                    updateLocationList(msgLaneName, 'None');
                }
            });

            laneDSColl.connectAllDS();
        }
    }, [dataSourcesByLane]);

    useEffect(() => {
        addSubscriptionCallbacks();
    }, [dataSourcesByLane]);


    const updateLocationList = (laneName: string, newStatus: string) => {
        setLocationList((prevState) => {
            const updatedList = prevState.map((data) => data.laneName === laneName ? {...data, status: newStatus} : data);
            return updatedList;
        })
    };


    /***************content in popup************/

    // method used to display information about the event reported by the Styler: onLeftClick & onHover

    function getContent(laneName: string, status: string) {
        //connect to video???

        console.log('status', status)
        return (
            `<div id='popup-data-layer' class='point-popup'>
                <hr />
                <h3 class='popup-text'>Status: ${status}</h3>
                <div id="popup-data-layer"> </div>
                <button onClick='location.href="./lane-view"' class="popup-button" type="button">VIEW LANE</button>
            </div>`
        );
    }
    return (
        <Box
            id="mapcontainer"
            style={{width: '100vw', height: '80vh'}}>
        </Box>
    );
}
