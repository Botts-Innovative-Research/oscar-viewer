"use client";

import {Box, Paper, Typography} from "@mui/material";

import {useEffect, useRef, useState} from "react";
import PointMarkerLayer from "osh-js/source/core/ui/layer/PointMarkerLayer";
import LeafletView from "osh-js/source/core/ui/view/map/LeafletView";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {useSelector} from "react-redux";
import {selectLanes} from "@/lib/state/OSCARClientSlice";
import {Datastream} from "@/lib/data/osh/Datastreams";
import {SelectedEvent} from "../../../types/new-types";



export default function MapViewPage() {

    const lanes: LaneMeta[] = useSelector(selectLanes);
    const ds : Datastream[] = Array.from(useSelector((state: any) => state.oshSlice.dataStreams.values()));

    const leafletContainer = useRef<HTMLDivElement>(null);
    // const leafletContainer = useRef(document.createElement('div'));

    // const videoContainer = useRef(null);

    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
    const [popupContent, setPopupContent] = useState<string | null>(null);

    // const [layer, setLayer] = useState(null);
    // // const [pointMarkers, setPointMarkers] = useState<PointMarkerLayer[]>(null);
    // const [videoLayer, setVideoLayer] = useState([]);

    const popupElt = document.getElementById("popup");
    const currentSelectedElt = document.getElementById("current-marker");

    //request the locations of the systems from the state
    // useEffect(() => {
    //     if(lanes.length >0){
    //         const newLayers = lanes.map((lane => new PointMarkerLayer({
    //             datasourceIds: lane.id,
    //             // location: {
    //             //     x: 34.725530,
    //             //     y: -86.637139,
    //             //     z: 0
    //             // },
    //             getLocation: (rec: any) => ({
    //                 x: rec.location.lon,
    //                 y: rec.location.lat,
    //                 z: rec.location.alt,
    //             }),
    //             icon: '/point.png',
    //             iconColor: '#567d14',
    //             iconSize: [32, 64],
    //             iconAnchor: [16, 65],
    //             defaultToTerrainElevation: true,
    //             name: lane.name,
    //             description: "GPS location of RPM Sensors"
    //         })));
    //         setPointMarkers(newLayers);
    //     }
    //     console.log('point markers', pointMarkers);
    // }, [lanes]);
    // useEffect(() => {
    //     if(pointMarkers && leafletContainer.current) {
    //
    //         let leafletView = new LeafletView({
    //             // container: leafletContainer.current,
    //             container: 'map-container',
    //             layers: pointMarkers,
    //             autoZoomOnFirstMarker: true
    //         });
    //     }
    //     console.log('layer', pointMarkers)
    // }, [pointMarkers]);


    function showPopup(x: number, y: number, laneName: string){
        setPopupPosition({x,y});
        setPopupContent({laneName});
        // const padding = 10;
        // popupElt.setAttribute("style", "left:" + (x + padding)+ ";top:"+ (y+padding)+ "; display:block !important; width:100px; height:50px");
        // popupElt.innerText = laneName;
    }
    function hidePopup(x: number, y:number, laneName: string){
        setPopupPosition(null);
        setPopupContent(null);
        // popupElt.setAttribute('style', 'display:none;');
        // popupElt.innerText = '';
    }

    // general point marker to reuse for multiple instances of lane sys
    const pointMarker = {
        // dataSourceId:
        name: 'lane',
        description: "GPS location of RPM Sensors",
        location: {x: 34.725530, y: -86.637139, z: 0},
        // getLocation: (rec: any) =>({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
        getLabel: (rec:any) => rec['id'],
        icon: './images/car-location.png',
        iconSize: [32, 32],
        iconAnchor: [16, 0],
        labelColor: '#00FFF5',
        defaultToTerrainElevation: true,
    };

    // here you would need to go through the systems and create a point marker for each system location
    // useEffect(() => {
    //
    //     // lanes.map((lane) =>{
    //         const pointMarkerLayer = new PointMarkerLayer({
    //             // location: {
    //             //     x: 34.725530,
    //             //     y: -86.637139,
    //             //     z: 0
    //             // },
    //             getLocation: (rec: any) =>({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
    //             getLabel: (rec:any) => rec['id'],
    //             icon: './point.png',
    //             iconSize: [32, 32],
    //             iconAnchor: [16, 0],
    //             labelColor: '#00FFF5',
    //             defaultToTerrainElevation: true,
    //             name: 'lane',
    //             description: "GPS location of RPM Sensors",
    //
    //             onLeftClick: (event: { mapBrowserEvent: { pixel: number[]; }; }) =>{
    //                 const rect = document.getElementById('leafletMap').getBoundingClientRect();
    //                 showPopup(event.mapBrowserEvent.pixel[0] + rect.left, event.mapBrowserEvent.pixel[1] + rect.top, 'some content ');
    //             }
    //         });
    //         setLayer(pointMarkerLayer);
    //     // })
    //
    // }, []);


  /******************VIEW***********************/

    useEffect(() => {
        // if(layer && leafletContainer.current) {
        if(leafletContainer.current) {
            let view = new LeafletView({
                container: leafletContainer.current.id,
                autoZoomOnFirstMarker: true,
                follow: false,
                // container: 'map-container',
                // layers: [layer],
                layers: [
                    new PointMarkerLayer({
                        ...pointMarker,
                        onLeftClick: (event: { mapBrowserEvent: { pixel: number[]; }; }) =>{
                            // const rect = document.getElementById('leafletMap').getBoundingClientRect();
                            const rect = leafletContainer.current?.getBoundingClientRect();
                            showPopup(event.mapBrowserEvent.pixel[0] + rect.left, event.mapBrowserEvent.pixel[1] + rect.top, 'some content ');
                        }
                    }),
                ],
            });

        }
    }, []);
    // }, [layer]);


    return (
      <Box>
          <Typography variant="h4" sx={{padding: 2 }}>Map</Typography>
          <br />
          <Paper variant='outlined' sx={{height: "600px", width: "100%"}}>
              {/*<div ref={leafletContainer} style={{width: "100%", height: "100%", padding: 10}}></div>*/}
              <div id="map-container" ref={leafletContainer} style={{width: "100%", height: "100%", padding: 10}}></div>


              {/*<MapComponent onSelectedMarker={()=>{}}/>*/}
          </Paper>
      </Box>
    );
}