
"use client"

import {useEffect, useMemo, useRef, useState} from "react";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView.js"
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import VideoView from "osh-js/source/core/ui/view/video/VideoView";
import VideoDataLayer from "osh-js/source/core/ui/layer/VideoDataLayer";
import {SelectedEvent} from "../../../../types/new-types";

interface MapProps{
    onSelectedMarker: (event:SelectedEvent)=> void;
}
export default function MapComponent({onSelectedMarker}: MapProps){

    const leafletContainer = useRef(null);
    const videoContainer = useRef(null);

    const [layer, setLayer] = useState(null);
    const [videoLayer, setVideoLayer] = useState(null);

    //request the locations of the systems from the state

    // here you would need to go through the systems and create a point marker for each system location
    useEffect(() => {
        const pointMarkerLayer = new PointMarkerLayer({
            labelOffset: [0, -30],
            location: {
                x: 34.735,
                y: -86.7232
            },
            icon: '/images/point.png',
            iconSize: [32, 64],
            iconAnchor: [16, 65],
            defaultToTerrainElevation: true,
            name: "Oscar",
            description: "GPS location of RPM Sensors"
        });
        setLayer(pointMarkerLayer);
    }, []);


    // create map view using leaflet
    useEffect(() => {
        if(layer && leafletContainer.current) {
            console.log('container', leafletContainer.current);
            let leafletView = new LeafletView({
                container: 'map-container',
                // container: leafletContainer.current,
                layers: [layer],
                autoZoomOnFirstMarker: true
            });
            console.log('layer initialized', layer);
            console.log('view', leafletView)
        }
    }, [layer]);


    // handle when the point marker is selected
        //  a window should come up with a overview of the lane
        //  will need a video view of the lane
        //  button to view lane
        //  status of lane
        //  name of lane


    // set lane view for when clicking on point marker
    //  todo: request the video component for when the lane is clicked!!!
    //delete after request

    useEffect(() => {
        const videoDataLayer = new VideoDataLayer({
            // dataSourceId: ''
            getFrameData: (rec:any) => rec.img,
            getTimestamp: (rec:any) => rec.time,
        });
        setVideoLayer(videoDataLayer);
    }, []);

    useEffect(() => {
        if(videoLayer && videoContainer.current){
            let videoView = new VideoView({
                container: videoContainer.current,
                css: 'video-h264',
                name: 'lane name',
                frameRate: 25,
                showTime: false,
                showStats: false,
                // dataSourceId: .id,
                layers: [videoLayer],
            });
            console.log('video layer', videoLayer);

        }


    }, [videoLayer]);

    const handlePopUp = () =>{
        layer.marker.addTo(leafletContainer)
            .bindPopup("you clicked this point marker")
            .openPopup();
    }


    // var popup = L.popup();
    // function onMarkerClick(event: Event){
    //     popup
    //         .setContent("You clicked the map!")
    //         .openOn(map);
    // }

    // need to add window pop up for code when pressing on pointmarker
    const handleSelectedMarker = (event: SelectedEvent) =>{
        onSelectedMarker(event);
    };


    return (
        <div>
            <div id="map-container" ref={leafletContainer}  style={{ width: "100%", height: "100%", padding: 10 }}></div>
        </div>
    );
}
