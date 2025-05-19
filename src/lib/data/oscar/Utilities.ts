/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// import {IDatastream} from "@/lib/data/osh/Datastreams";
import ConSysApi from "osh-js/source/core/datasource/consysapi/ConSysApi.datasource";
import DataStream from "osh-js/source/core/consysapi/datastream/DataStream";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {INode} from "@/lib/data/osh/Node";
import {ConfigDatastreamConstant} from "@/app/_components/state-manager/Config";

/**
 *
 * @param laneDatastreams map of lane name to specific datastreams
 * @param datasource singular ConSysApi Datasource
 * @param sourceToStreamMap map of datasource id to datastream id, from state, typically
 */
export function associateDatasourceToLane(laneDatastreams: Map<string, typeof DataStream>, datasource: typeof ConSysApi, sourceToStreamMap: Map<string, string>) {
    let newLaneDSPair = {laneName: "", datasource: datasource};
    for (let [laneName, datastreams] of laneDatastreams) {
        for (let ds of datastreams) {
            if (sourceToStreamMap.has(ds.id)) {
                newLaneDSPair.laneName = laneName;
                break;
            }
        }
    }
}

export function datastreamsOfSystemIdsArray(systemsIds: string[], datastreamsMap: Map<string, typeof DataStream>): typeof DataStream[] {
    let dsArr: typeof DataStream[] = Array.from(datastreamsMap.values());
    let matchingDatastreams: typeof DataStream[] = [];
    let filtered = dsArr.filter(ds => systemsIds.includes(ds.parentSystemId));
    return filtered;
}

export function getDatastreamsOfLanes(lanes: LaneMeta[], datastreamsMap: Map<string, typeof DataStream>): Map<string, typeof DataStream[]> {
    let laneDatastreams: Map<string, typeof DataStream[]> = new Map<string, typeof DataStream[]>();
    for (let lane of lanes) {
        let dsOfLane = datastreamsOfSystemIdsArray(lane.systemIds, datastreamsMap);
        laneDatastreams.set(lane.name, dsOfLane);
    }
    return laneDatastreams;
}

export function getDatasourcesOfLane(laneDatastreams: Map<string, typeof DataStream[]>, datasources: typeof ConSysApi[], dsToDatastreamMap: Map<string, string>): Map<string, typeof ConSysApi> {
    let laneDatasources: Map<string, typeof ConSysApi> = new Map<string, typeof ConSysApi>();
    let dsKeys = Array.from(dsToDatastreamMap.keys());
    let lanes = Array.from(laneDatastreams.keys());
    // create a map with keys that match the lane names


    for (let dsKey of dsKeys) {
        let keyInLane: string = null;
        // the keys are '[dataStreamId]-datastream'
        let streamIDFromKey = dsKey.split("-")[0];
        for (let lane of lanes) {
            // is the datastream in the lane?
            let streamsOfLane = laneDatastreams.get(lane);
            if (streamsOfLane.some(stream => stream.id === streamIDFromKey)) {
                keyInLane = lane;
                break;
            }
        }
        if (keyInLane !== null) {
            let ds = datasources.find(ds => ds.name === dsKey);
            let newArr = laneDatasources.get(keyInLane) ? laneDatasources.get(keyInLane) : [];
            newArr.push(ds);
            laneDatasources.set(keyInLane, newArr);
        }
    }

    return laneDatasources;
}


export function isLocationDatastream(datastream: typeof DataStream): boolean {
    const SENSOR_LOCATION_DEF = "http://www.opengis.net/def/property/OGC/0/SensorLocation";
    const LOCATION_VECTOR_DEF = 'http://sensorml.com/ont/swe/property/LocationVector';

    return datastream.properties.observedProperties[0].definition.includes(SENSOR_LOCATION_DEF)
        || datastream.properties.observedProperties[0].definition.includes(LOCATION_VECTOR_DEF);
}

export function isVideoDatastream(datastream: typeof DataStream): boolean {
    const RASTER_IMAGE_DEF = "http://sensorml.com/ont/swe/property/RasterImage";
    const VIDEO_FRAME_DEF = "http://sensorml.com/ont/swe/property/VideoFrame";

    return datastream.properties.observedProperties[0].definition.includes(RASTER_IMAGE_DEF)
    || datastream.properties.observedProperties[0].definition.includes(VIDEO_FRAME_DEF);
}

export function isGammaDatastream(datastream: typeof DataStream): boolean {
    const ALARM_DEF = "http://www.opengis.net/def/alarm";
    const GAMMA_COUNT_DEF = "http://www.opengis.net/def/gamma-gross-count";

    return datastream.properties.observedProperties[0].definition.includes(ALARM_DEF)
        && datastream.properties.observedProperties[1].definition.includes(GAMMA_COUNT_DEF);
}

export function isNeutronDatastream(datastream: typeof DataStream): boolean {
    const ALARM_DEF = "http://www.opengis.net/def/alarm";
    const NEUTRON_COUNT_DEF = "http://www.opengis.net/def/neutron-gross-count";

    return datastream.properties.observedProperties[0].definition.includes(ALARM_DEF)
        && datastream.properties.observedProperties[1].definition.includes(NEUTRON_COUNT_DEF);
}

export function isTamperDatastream(datastream: typeof DataStream): boolean {
    const TAMPER_STATUS_DEF = "http://www.opengis.net/def/tamper-status";

    return datastream.properties.observedProperties[0].definition.includes(TAMPER_STATUS_DEF);
}

export function isOccupancyDatastream(datastream: typeof DataStream): boolean {
    const OCCUPANCY_PILLAR_DEF = "http://www.opengis.net/def/pillar-occupancy-count";

    return datastream.properties.observedProperties[0].definition.includes(OCCUPANCY_PILLAR_DEF);
}

export function isConnectionDatastream(datastream: typeof DataStream): boolean {
    const CONNECTION_DEF ="http://www.opengis.net/def/connection-status";

    return datastream.properties.observedProperties[0].definition.includes(CONNECTION_DEF);
}

export function isThresholdDatastream(datastream: typeof DataStream): boolean {
    const THRESHOLD_DEF ="http://www.opengis.net/def/threshold";

    return datastream.properties.observedProperties[0].definition.includes(THRESHOLD_DEF);
}

export function isConfigurationDatastream(datastream: typeof DataStream): boolean {
    const CONFIG_DEF ="http://www.opengis.net/def/threshold";

    return datastream.properties.observedProperties[0].definition.includes(CONFIG_DEF);
}



// export async function insertSystem(node: INode, systemJSON: any, ep: string, dsConstant: any): Promise<string> {
//
//     console.log("Inserting System: ", ep, JSON.stringify(systemJSON));
//
//     const response = await fetch(ep, {
//         method: 'POST',
//         mode: 'cors',
//         body: JSON.stringify(systemJSON),
//         headers: {
//             ...node.getBasicAuthHeader(),
//             'Content-Type': 'application/sml+json'
//         }
//     });
//
//     if (response.ok) {
//         console.log("System Inserted: ", response.headers.get("Location"));
//         let sysId = response.headers.get("Location").split("/").pop();
//
//         let endpoint = ep + sysId +"/datastreams/";
//         await insertDatastream(node, endpoint, dsConstant);
//         return sysId;
//     } else {
//         console.warn("Error inserting system: ", response);
//     }
// }
//
// export async function insertDatastream(node: INode, endpoint: string, dsConstant: any): Promise<string> {
//     // let ep: string = `${node.getConfigEndpoint(false)}/systems/${systemId}/datastreams/`;
//     console.log("Inserting Datastream: ");
//
//     const response = await fetch(endpoint, {
//         method: 'POST',
//         mode: 'cors',
//         body: JSON.stringify(dsConstant),
//         // body: JSON.stringify(ConfigDatastreamConstant),
//         headers: {
//             ...node.getBasicAuthHeader(),
//             'Content-Type': 'application/json'
//         }
//     });
//
//     if (response.ok) {
//         console.log("Datastream Inserted Response: ", response);
//         let dsId = response.headers.get("Location").split("/").pop();
//         return dsId;
//     } else {
//         console.warn("Error inserting Datastream: ", response);
//     }
// }