"use client"


import React, {useEffect, useRef, useState} from "react";
import L from "leaflet";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {Datastream} from "@/lib/data/osh/Datastreams";
import VideoComponent from "../video/VideoComponent";
import {useSelector} from "react-redux";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {selectLanes} from "@/lib/state/OSCARClientSlice";

import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import {Protocols} from "@/lib/data/Constants";
import {Mode} from "osh-js/source/core/datasource/Mode";

import {MapView} from "osh-js/source/core/ui/view/map/MapView"
import "./Map.css";
import {EventType} from "osh-js/source/core/event/EventType";
import {SiteMapData} from "../../../../types/new-types";



export default function MapComponent() {

    // @ts-ignore
    const mapContainerRef = useRef<LeafletView>();
    // const mapContainerRef = useRef<HTMLDivElement>(null);

    let server = `162.238.96.81:8781`;
    let endTime = new Date((new Date().getTime() - 1000000)).toISOString();
    let startTime = "2020-01-01T08:13:25.845Z";

    const [status, setStatus] = useState(null);

    /****************ds and lanes *******************/
    const lanes: LaneMeta[] = useSelector(selectLanes);
    const ds : Datastream[] = Array.from(useSelector((state: any) => state.oshSlice.dataStreams.values()));

    // console.log(lanes.map((lane) => ds.filter((dss) => dss.name.includes(`${lane.name} - Sensor Location`))));

    let gammaDatastreams: any[] =[];
    let neutronDatastreams: any[] =[];
    let videoDatastreams: any[] =[];

    let gammaDatasources: any[] = [];
    let neutronDatasources: any[] = [];
    /****************************gamma & neutron *************************/
    useEffect(() => {
        if(ds.length > 0) {
            lanes.map((lane) => {
                const videoStreams = ds.filter((dss) => (lane.systemIds.includes(dss.parentSystemId) && dss.name.includes("Video") && dss.name.includes("Lane")));
                const gammaStreams = ds.filter((dss) => (lane.systemIds.includes(dss.parentSystemId) && dss.name.includes("Gamma") && dss.name.includes("Count")));
                const neutronStreams = ds.filter((dss)=>(lane.systemIds.includes(dss.parentSystemId) && dss.name.includes("Neutron") && dss.name.includes("Count")));

                gammaDatastreams.push(gammaStreams);
                neutronDatastreams.push(neutronStreams);
                videoDatastreams.push(videoStreams);
            });

            if (gammaDatastreams.length > 0) {
                console.log('streams', gammaDatastreams);
                gammaDatastreams.map((stream) => {
                    let newDatasource = new SweApi(stream.name, {
                        tls: false,
                        protocol: Protocols.WS,
                        mode: Mode.REAL_TIME,
                        endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
                        resource: `/datastreams/${stream[0].id}/observations`,
                        connectorOpts: {
                            username: 'admin',
                            password: 'admin',
                        },
                    });
                    newDatasource.connect();
                    gammaDatasources.push(newDatasource);
                });
            }
            if (neutronDatastreams.length > 0) {
                console.log('streams', neutronDatastreams);
                neutronDatastreams.map((stream) => {
                    let newDatasource = new SweApi(stream[0].name, {
                        tls: false,
                        protocol: Protocols.WS,
                        mode: Mode.REAL_TIME,
                        endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
                        resource: `/datastreams/${stream[0].id}/observations`,
                        connectorOpts: {
                            username: 'admin',
                            password: 'admin',
                        },
                    });
                    newDatasource.connect();
                    neutronDatasources.push(newDatasource);
                });
            }
            console.log('gamma sources', gammaDatasources);
            console.log('neutron sources', neutronDatasources);

        }

        // if(gammaDatasources !== null) {
        //     gammaDatasources.forEach((ds) => {
        //         ds.subscribe((message: any) => {
        //             const alarmState = message.values[0].data.alarmState;
        //             console.log('state', alarmState);
        //             setStatus(alarmState);
        //         }, [EventType.DATA]);
        //     });
        // }
        //
        // if(neutronDatasources !== null) {
        //     neutronDatasources.forEach((ds) => {
        //         ds.subscribe((message: any) => {
        //             const alarmState = message.values[0].data.alarmState;
        //             setStatus(alarmState);
        //         }, [EventType.DATA]);
        //     });
        // }
    }, [ds, lanes]);


    /****************hover*********************/
    const currentMarkerEle = document.getElementById("current-marker");
    function updateInfos(markerId: any, position: any, positionPixels: any) {
        // if(currentMarkerEle){
        //     currentMarkerEle.innerHTML = 'Current selected marker: <strong>' + markerId + '</strong>, ' + 'pos= ' + position + ', ' + 'pixel= ' + positionPixels
        // }
        currentMarkerEle.innerHTML = '<strong>' + markerId + '</strong>'
    }

    /****************pop up********************/

    //on left click -> show popup! rather than using the description method

    // // function showPopup(latlng: any, laneName: string, status: string){
    // function showPopup(latlng: any, content:any, markerId: any) {
    //     // function showPopup(latlng: any, content: any){
    //     //     console.log('status:', status);
    //     //     console.log('lane name', laneName);
    //     //     return new L.Popup()
    //     //         .setLatLng(latlng)
    //     //         .setContent(content);
    //     // .setContent(getContent(laneName, status));
    //     // .openOn(view);
    //     const padding = 10;
    //     popup.setAttribute("style", "left:" + (latlng.x + padding) + ";top:" + (latlng.y + padding) + "; display:block !important; width:100px; height:50px");
    //     popup.innerText = content;
    //
    // }

    // function showPopup(x: any, y: any, content: any) {
    //     const popupEle = document.getElementById("popup");
    //     const padding = 10;
    //     popupEle.setAttribute("style", "left:" + (x + padding) + ";top:" + (y + padding) + "; display:block !important; width:100px; height:50px");
    //     popupEle.innerText = content;
    // }

    /***********const layer*********************/
    const commonMarker = {
        getLocation: (rec: any) =>({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
        markerId: () => this.getId(),
        icon: '/point.png',
        zoomLevel: 12,
        iconAnchor: [16, 0],
        iconSize: [16, 16],
        labelColor: '#f1f5f4',
        labelOffset: [-5,-15]
    }

    /********************* map view and location ds************************/
    useEffect (()=>{
        let locationStreams: any[] =[];
        let gpsDataSources: any[] = [];
        let pointMarkers: any[] = [];
        if(ds.length > 0) {
            lanes.map((lane) => {
                let streams = ds.filter((dss) => dss.name.includes(`${lane.name} - Sensor Location`));
                locationStreams.push(streams);
            });
            if (locationStreams.length > 0) {
                locationStreams.map((stream) => {
                    let newDatasource = new SweApi(stream[0].name.split('-')[0], {
                        startTime: startTime,
                        endTime: endTime,
                        tls: false,
                        protocol: Protocols.WS,
                        mode: Mode.BATCH,
                        endpointUrl: `${server}/sensorhub/api`, //update to access ip and port from server
                        resource: `/datastreams/${stream[0].id}/observations`,
                        connectorOpts: {
                            username: 'admin',
                            password: 'admin',
                        },
                    })
                    gpsDataSources.push(newDatasource);
                });
            }
        }

        /*****************layers***********************/
        //create a point marker for each system location
        if(gpsDataSources.length > 0) {
            gpsDataSources.forEach((gps) => {
                let newPointMarker = new PointMarkerLayer({
                    ...commonMarker,
                    dataSourceId: gps.getId(),
                    description: getContent(gps.name, status), //currently using the description as a workaround for the pop up until i figure out how to get the onLeftClick to work
                    onHover: (markerId: string, markerObject: Object, layer: any, event: Object)=>{
                        console.log('hover!!');
                        let selectedMarker = document.getElementById('current-marker');
                        selectedMarker.innerHTML = gps.name;
                    },

                    // label: gps.getName(), // need to get the onHover to work for now it is gunna duplicate the lane name text in the popup

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
                pointMarkers.push(newPointMarker);
            });
            /*********************VIEW****************************/
            if (!mapContainerRef.current) {
                mapContainerRef.current = new LeafletView({
                    container: "mapcontainer",
                    // container: mapContainerRef.current.id,
                    layers: pointMarkers,
                    autoZoomOnFirstMarker: false,
                    showTime: true,
                    showStats: true
                });
                gpsDataSources.map((gps) => gps.connect());
            }
            return () => {
                if (mapContainerRef.current) {
                    mapContainerRef.current.destroy();
                    mapContainerRef.current = undefined;
                }
            }
        }

    },[ds, lanes]);


    /***************content in popup************/
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

        // div.innerHTML = '<h2>'+ laneName +'</h2> <br/> <h2>Status:'+ status +'</h2><video autoplay>'+  +'</video>';
        // div.innerHTML = '<h3 class="popup-text-lane">' + laneName + '</h3><h3 class="popup-text-status">Status: ' + status + '</h3><video>' + videoview + '</video>';

        //create button
        const button = document.createElement("button");
        button.className = 'popup-button';
        button.textContent = "LANE VIEW";
        // button.onclick = function () {
        //     window.location.href = '/lane-view';
        // };
        button.addEventListener('click', () =>{
            console.log('clicked')
            window.location.href= '/lane-view';});

        div.appendChild(laneNameEle);
        div.appendChild(statusEle);
        div.appendChild(video);
        div.appendChild(button);

        //TODO: replace video with lane video
        //TODO: replace status with lane status

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
        <div
            id="mapcontainer"
            // ref={mapContainerRef}
            style={{width: "100%", height: "100%", padding: 10}}>
        </div>
    );
}

/***********create markers function */
// function createMarkers(latlng: any, laneName: string){
//     var icon = L.icon({
//         iconUrl: '/point.png',
//         iconSize: [24,24]
//     });
//     return L.marker(latlng, {
//         title: laneName,
//         icon: icon
//     })
// }

/******************VIEW***********************/
// useEffect(() =>{
//     if(layers && mapContainer.current) {
//         let leafletMapView = new LeafletView({
//             container: mapContainer.current.id,
//             layers: [layers],
//             autoZoomOnFirstMarker: true
//         });
// var map = leafletMapView.map.setView(new L.LatLng(34.725530, -86.637139), 15);
// // // L.marker([34.725530, -86.637139]).addTo(leafletMapView.map).on('click', onClick);
// // // L.marker([34.725530, -86.637139]).bindPopup('lanename' + '<br>' + ("<button id='draw' </button>).click(alert('hello!')));
// var icon = L.icon({
//     iconUrl: '/point.png',
//     iconSize: [24,24]
// });
// var marker = L.marker([34.725530, -86.637139], {
//     title: "lane name", //hover over marker itll tell lane name
//     icon: icon
// }).addTo(map).bindPopup(showPopup({lat: 47.222293, lng: -74.006015}, leafletMapView)
//     // "<h2>lane name</h2> <br> <h3>Status: </h3> <br> <button style='background: transparent; border-color: #2397f3; color: #2397F3;'/lane-view''>VIEW LANE</button>"
// );
// L.marker([34.725530, -86.637139]).bindPopup(showPopup({lat: 47.222293, lng: -74.006015}, leafletMapView));
//         // marker.bindPopup("<b>Hello Kalyn</b><br> Iam pop up").openPopup();
//         // L.popup().setLatLng([34.725530, -86.637139]).setContent('popup!!').openOn(map);
//     }
// }, [layers]);


/********start streaming*********/

// gpsDataSource.connect();