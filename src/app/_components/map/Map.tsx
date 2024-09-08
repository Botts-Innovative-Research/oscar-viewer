"use client"

import {SelectedEvent} from "../../../../types/new-types";
import MapComponent from "@/app/_components/map/MapComponent";

export default function Map(){


    const handleSelectedMarker = (event: SelectedEvent) =>{
        console.log(event);
    };


    return(
        <div>
            <MapComponent onSelectedMarker={handleSelectedMarker}/>
        </div>
    );
}