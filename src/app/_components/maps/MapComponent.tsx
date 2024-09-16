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
import ReactDOM from "react-dom";
import Link from "next/link";
import VideoComponent from '@/app/_components/video/VideoComponent';
import {renderToString} from "react-dom/server";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import {LeafletEvent, LeafletMouseEvent} from "leaflet";
import { findInObject } from "@/app/utils/Utils";



export default function MapComponent(){

    const mapViewRef = useRef< typeof LeafletView | null>(null);
    const videoViewRef = useRef<typeof VideoView | null>(null);

    let pointMarkers: any[] = [];
    let videoLayers: any[] = [];

    const [locationList, setLocationList] = useState<LaneWithLocation[] | null>(null);
    const [videoList, setVideoList] = useState<LaneWithVideo[] | null>(null);

    /****global datasource references***/
    const {laneMapRef} = useContext(DataSourceContext);
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    const [dataSourcesByLane, setDataSourcesByLane] = useState<Map<string, LaneDSColl>>(new Map<string, LaneDSColl>());

    /******************location & video datasource********************/
    useEffect(() =>{
        if(locationList == null || locationList.length === 0 && laneMap.size > 0) {
            let locations: LaneWithLocation[] = [];
            let videos: LaneWithVideo[] = [];

            laneMap.forEach((value, key) => {
                if (laneMap.has(key)) {
                    let ds: LaneMapEntry = laneMap.get(key);
                    const locationSources = ds.datasourcesBatch.filter((item) => item.name.includes('Sensor Location') && item.name.includes('Lane'));
                    const videoSources = ds.datasourcesRealtime.filter((item) => item.name.includes('Video') && item.name.includes('Lane'));

                    const laneWithLocation: LaneWithLocation = {
                        laneName: key,
                        locationSources: locationSources,
                        status: 'None',
                    };

                    const laneWithVideo: LaneWithVideo = {
                        laneName: key,
                        videoSources: videoSources,
                        status: 'None',
                    };
                    locations.push(laneWithLocation);
                    videos.push(laneWithVideo);
                }
            });
            console.log(videos);
            console.log(locations);

            setLocationList(locations);
            setVideoList(videos);
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
            locationList.forEach((location) => {
                location.locationSources.map((loc) => {
                    let newPointMarker = new PointMarkerLayer({
                        dataSourceId: loc.getId(),
                        getLocation: (rec: any) => ({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
                        label: location.laneName,
                        markerId: () => this.getId(),
                        icon: '/point.png',
                        zoomLevel: 15,
                        iconAnchor: [16, 16],
                        labelOffset: [-5, -15],
                        iconSize: [16, 16],
                        iconScale: 1.0,
                        // onLeftClick: (markerId: string, markerObject: Object, event: LeafletMouseEvent) => {},
                        // onRightClick: getContent(location.laneName, location.status)
                        // onHover: (markerId: any, markerObject: any, event: any) => {},

                        description: getContent(location.laneName, location.status),
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
            locationList.map((location) => location.locationSources.map((src) => src.connect()));
        }


        if(videoList !== null) {
            videoList.forEach((video) =>{
                video.videoSources.map((vid) =>{
                    const newVideoLayer = new VideoDataLayer({
                        dataSourceId: vid.getId(),
                        getFrameData: (rec: any) => rec.img,
                        getTimestamp: (rec: any) => rec.time,
                    });
                    videoLayers.push(newVideoLayer);
                });
            })
            console.log('video', videoLayers)
            if(!videoViewRef.current){
                videoViewRef.current = new VideoView({
                    container: 'videocontainer',
                    showTime: false,
                    showStats: false,
                    layers: videoLayers
                });
            }
            console.log('ref', videoViewRef)
        }


        return () => {
            if (mapViewRef.current) {
                mapViewRef.current.destroy();
                mapViewRef.current = null;
            }
        }
    }, [locationList, videoList]);

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
    }, [dataSourcesByLane, locationList]);

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

        videoList.map((video) => video.videoSources.map((src) => {
            if(laneName === video.laneName) {
                console.log('connecting', laneName);
                src.connect();
            }
        }));

        console.log('status', status)
        return (
            `<div class='point-popup'>
                <hr />
                <h3 class='popup-text'>Status: ${status}</h3>
                <video autoplay  id="videocontainer" ref={videoViewRef.current} width: '100%' height: '100%'>
                    <source src={videoViewRef.current}/>
                
                </video>
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