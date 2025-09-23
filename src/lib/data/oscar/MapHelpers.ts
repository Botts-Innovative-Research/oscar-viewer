

/***********const point marker layer*********************/
export const commonMarker = {
    getLocation: (rec: any) =>({x: rec.location.lon, y: rec.location.lat, z: rec.location.alt}),
    icon: '/offline.svg',
    zoomLevel: 12,
    iconAnchor: [16, 0],
    iconSize: [16, 16],
    labelColor: '#f1f5f4',
    labelOffset: [-5,-15]
}

/***********left click on marker icon************/
export function showPopup(){

}

/***********click anywhere on the map***********/
export function hidePopup(){

}

/************hover over marker icon************/
export function updateInfo(){

}

