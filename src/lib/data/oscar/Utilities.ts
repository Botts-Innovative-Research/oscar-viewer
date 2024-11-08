/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {IDatastream} from "@/lib/data/osh/Datastreams";
import SweApi from "osh-js/source/core/datasource/sweapi/SweApi.datasource";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";

/**
 *
 * @param laneDatastreams map of lane name to specific datastreams
 * @param datasource singular SweApi Datasource
 * @param sourceToStreamMap map of datasource id to datastream id, from state, typically
 */
export function associateDatasourceToLane(laneDatastreams: Map<string, IDatastream>, datasource: typeof SweApi, sourceToStreamMap: Map<string, string>) {
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

export function datastreamsOfSystemIdsArray(systemsIds: string[], datastreamsMap: Map<string, IDatastream>): IDatastream[] {
    let dsArr: IDatastream[] = Array.from(datastreamsMap.values());
    let matchingDatastreams: IDatastream[] = [];
    let filtered = dsArr.filter(ds => systemsIds.includes(ds.parentSystemId));
    return filtered;
}

export function getDatastreamsOfLanes(lanes: LaneMeta[], datastreamsMap: Map<string, IDatastream>): Map<string, IDatastream[]> {
    let laneDatastreams: Map<string, IDatastream[]> = new Map<string, IDatastream[]>();
    for (let lane of lanes) {
        let dsOfLane = datastreamsOfSystemIdsArray(lane.systemIds, datastreamsMap);
        laneDatastreams.set(lane.name, dsOfLane);
    }
    return laneDatastreams;
}

export function getDatasourcesOfLane(laneDatastreams: Map<string, IDatastream[]>, datasources: SweApi[], dsToDatastreamMap: Map<string, string>): Map<string, SweApi> {
    let laneDatasources: Map<string, SweApi> = new Map<string, SweApi>();
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

export function isVideoDatastream(datastream: typeof DataStream): boolean {
    const RASTER_IMAGE_DEF = "http://sensorml.com/ont/swe/property/RasterImage";
    const VIDEO_FRAME_DEF = "http://sensorml.com/ont/swe/property/VideoFrame";

    return datastream.properties.observedProperties[0].definition.includes(RASTER_IMAGE_DEF)
    || datastream.properties.observedProperties[0].definition.includes(VIDEO_FRAME_DEF);
}