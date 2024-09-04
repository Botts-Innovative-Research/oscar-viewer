"use client";

import {SelectedEvent} from "../../../types/new-types";

interface MapProps{
    onPointMarkerSelect: (event:SelectedEvent)=> void;
}
export default function Map({onPointMarkerSelect}: MapProps){

    const handleSelectedMarker = (event: SelectedEvent) =>{
        onPointMarkerSelect(event);
    };

    return (
        <div>
            {

            }
        </div>
    );

};