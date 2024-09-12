"use client"

import React, {useEffect, useRef, useState} from "react";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {useSelector} from "react-redux";
import {RootState} from "@/lib/state/Store";
import {selectLaneMap} from "@/lib/state/OSCARClientSlice";
import Box from "@mui/material/Box";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";

import './Map.css';
export default function MapComponent(){
    const laneMap = useSelector((state: RootState) => selectLaneMap(state));

    // @ts-ignore
    const mapViewRef = useRef<LeafletView | null>(null);
    // @ts-ignore
    let pointMarkers: PointMarkerLayer[] = [];
    let locationDs: typeof SweApi[] = [];
    let gammaDs: typeof SweApi[] = [];


    // const [locationDs, setLocationDs] = useState<SweApi[]>([]);
    // const [pointMarkers, setPointMarkers] = useState<PointMarkerLayer[]>([]);

    /*****************lane status******************/
    useEffect(() => {
        if(laneMap.size > 0){
            laneMap.forEach((value,key) => {
                if(laneMap.has(key)){
                    let ds: LaneMapEntry = laneMap.get(key);
                    const rpmGamma = ds.datasourcesRealtime.filter((item) => item.name.includes("Gamma Count"));
                    gammaDs.push(rpmGamma);

                }
            });
        }
        console.log('gamma', gammaDs);
    },[laneMap]);

    /******************map view********************/
    useEffect(() =>{
        if(laneMap.size > 0 && !mapViewRef.current){
            console.log(laneMap)
            laneMap.forEach((value, key) =>{
                if(laneMap.has(key)){
                    let ds: LaneMapEntry = laneMap.get(key);
                    const rpmLocation = ds.datasourcesBatch.filter((item) => item.name.includes('Sensor Location') && item.name.includes('Lane'));
                    locationDs.push(rpmLocation);
                    // locationDs.push(ds.datasourcesBatch[0]);
                }
            })

            console.log(locationDs);
            if(locationDs.length > 0){
                locationDs.map((loc) => {
                    const newPointMarker = new PointMarkerLayer({
                        markerId: () => this.getId(),
                        getLocation: (rec: any) =>({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
                        icon: '/point.png',
                        iconAnchor: [16, 16],
                        iconSize: [16, 16],
                        iconScale: 1.0,
                        labelSize: 16,
                        labelScale: 1.0,
                        zoomLevel: 15,
                        defaultToTerrainElevation: false,
                        labelOffset: [-5,-15],
                        dataSourceId: loc[0].getId(),
                        // onHover: (markerId: string, markerObject: Object, layer: any, event: Object) => {
                        //     console.log('hover!!');
                        //
                        // }

                        // description: getContent(loc[0].name.split('-')[0], 'status'), //currently using the description as a workaround for the pop up until i figure out how to get the onLeftClick to work
                        // props:{
                        //     onLeftClick: (markerId: string, markerObject: any, event: any) =>{
                        //         setPopupContent(getContent(loc[0].name.split('-')[0], 'status'));
                        //         setPopupPosition({
                        //             x: event.containerPoint.x,
                        //             y: event.containerPoint.y
                        //         });
                        //     },
                        // },
                        // onHover: (markerId: string, markerObject: Object, layer: any, event: Object) =>{
                        //     let selectedMarker = document.getElementById('current-marker');
                        //
                        // },
                        // onHover: (markerId: string, markerObject: Object, layer: any, event: Object)=>{
                        //     console.log('hover!!');
                        //     let selectedMarker = document.getElementById('current-marker');
                        //     selectedMarker.innerHTML = '<strong>'+ gps.name + '</strong>';
                        // },
                        // label: loc[0].name.split('-')[0], // need to get the onHover to work for now it is gunna duplicate the lane name text in the popup
                        // onLeftClick: (markerId: any, markerObject: any, event: any) => updateInfos(markerId, event.latlng, event.containerPoint),
                        // onRightClick: (markerId: any, billboard: any, event: any) => {
                        //     const rect = document.getElementById('leafletMap').getBoundingClientRect();
                        //     console.log('rect', rect)
                        //     showPopup(event.containerPoint.x + rect.left, event.containerPoint.y + rect.top + 15, getContent(gps.name, 'alarm') + markerId);
                        // },
                        // onHover: (markerId: string, markerObject: any, event: any) => {
                        //     updateInfos(markerId, event.latlng, event.containerPoint)
                        // },
                        // onLeftClick: (markerId: any, markerObject: any, event: any) => {
                        //     const rect = document.getElementById('mapcontainer')
                        //     showPopup({lat: event.containerPoint.x , lon: event.containerPoint.y}, getContent(gps.name, 'alarm'), 0);
                        // },
                    });
                    console.log(newPointMarker)
                    pointMarkers.push(newPointMarker);
                });
                console.log('pointmarkers', pointMarkers);

                /*********************VIEW****************************/
                    if (!mapViewRef.current) {
                        mapViewRef.current = new LeafletView({
                            container: "mapcontainer",
                            layers: pointMarkers,
                            autoZoomOnFirstMarker: true,
                        });
                    }
                    locationDs.map((ds) => ds[0].connect());
                }
        }

        return () => {
            if (mapViewRef.current) {
                mapViewRef.current.destroy();
                mapViewRef.current = null;
            }
        }
    },[laneMap]);


    /***************content in popup************/
    //TODO: replace video with lane video
    //TODO: replace status with lane status
    function getContent(laneName: string, status: string) {
        // let videoStream;
        // console.log('lanes with viedo', lanesWithVideo)
        // if(lanesWithVideo !== null){
        //     videoStream = lanesWithVideo[1].videoDatastreams;
        // }
        let videocomponent =  `<VideoComponent videoDatastreams={videoDatastreams[0]}/>`
        // let videoview = "<video> <source src=" + videocomponent + "</video>"

        // let videoview = "<source src=\"https://www.w3schools.com/html/mov_bbb.mp4\" type=\"video/mp4\" style='overflow: hidden'>"

        // create main div
        const div = document.createElement("div");
        div.className = 'point-popup';

        const laneNameEle = document.createElement("h3");
        laneNameEle.className = 'popup-text-lane';
        laneNameEle.textContent = laneName;

        const statusEle = document.createElement("h3");
        statusEle.className = 'popup-text-status';
        statusEle.textContent = `Status: ${status}`;

        const video = document.createElement("video");
        const source = document.createElement("source");

        source.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
        // source.src = videocomponent;

        source.type = 'video/mp4';
        video.appendChild(source);

        //create button
        const button = document.createElement("button");
        button.className = 'popup-button';
        button.textContent = "LANE VIEW";


        div.appendChild(laneNameEle);
        div.appendChild(statusEle);
        div.appendChild(video);
        div.appendChild(button);

        return div.outerHTML;
        // "<div class='point-popup'>" +
        //     "<h3 class='popup-text-lane'>" + laneName + "</h3>" +
        //     "<h3 class='popup-text-status'>Status: "+ status +"</h3>" +
        //     "<video><source " + <VideoComponent videoDatastreams={videoDatastreams[0]}/> + "></video>" +
        //     // "<div class='video-container'>" + videocomponent + "</div>" +
        //     // "<video <source src=" +
        //
        // // + " type='video/h264' /></video>" +
        //
        // // <VideoComponent videoDatastreams={videoDatastreams[0]}/>
        //     // "<video autoplay> <source src='https://www.w3schools.com/html/mov_bbb.mp4' type='video/mp4'/></video>" +
        //     "<button class='popup-button' onclick='function()=>{window.location.href=`/lane-view`}'>LANE VIEW</button>" +
        // "</div>"
        // );
    }

    return (
        <Box
            id="mapcontainer"
            style={{width: '80vw', height: '35vh'}}>
        </Box>
    );

}



