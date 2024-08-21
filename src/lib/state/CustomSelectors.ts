/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSelector} from "@reduxjs/toolkit";
import {RootState} from "@/lib/state/Store";
import {selectLanes} from "@/lib/state/OSCARClientSlice";
import {selectDatastreams, selectSystems} from "@/lib/state/OSHSlice";
import {LaneMeta} from "@/lib/data/oscar/LaneCollection";
import {System} from "@/lib/data/osh/Systems";


/**
 * Selects the systems of a lane
 * @param laneID the internal ID of the lane
 */
export const selectSystemsOfLane = (laneID: string) => createSelector(
    (state: RootState) => selectLanes(state),
    (state: RootState) => selectSystems(state),
    (lanes, systems) => {
        const selectedLane: LaneMeta = lanes.find((lane: { id: string; }) => lane.id === laneID);
        let systemsOfLane: System[] = [];
        for (let sysId of selectedLane.systemIds) {
            let system = systems.find((system: { id: string; }) => system.id === sysId);
            if (system !== undefined) {
                systemsOfLane.push(system);
            }
        }
        return systemsOfLane;
    }
);

/**
 * Selects the datastreams of a lane
 * @param laneID internal ID of the lane
 */
export const selectDatastreamsOfLane = (laneID: string) => createSelector(
    (state: RootState) => selectSystemsOfLane(laneID)(state),
    (state: RootState) => selectDatastreams(state),
    (systemsOfLane, datastreams) => {
        const datastreamsOfLane = [];
        for (let [id, ds] of datastreams.entries()) {
            if (systemsOfLane.find((system: { id: string; }) => system.id === ds.parentSystemId)) {
                datastreamsOfLane.push(ds);
            }
        }
        return datastreamsOfLane;
    }
);

/**
 * Selects the systems of a lane by the lane's name
 * @param laneName Name of the lane
 */
export const selectSystemsOfLaneByName = (laneName: string) => createSelector(
    (state: RootState) => selectLanes(state),
    (lanes) => {
        const selectedLane: LaneMeta = lanes.find((lane: { name: string; }) => lane.name === laneName);
        if (selectedLane === undefined) {
            console.warn("Lane not found");
            return [];
        }
        return selectSystemsOfLane(selectedLane.id);
    }
);

/**
 * Selects the datastreams of a lane by the lane's name
 * @param laneName
 */
export const selectDatastreamsOfLaneByName = (laneName: string) => (state: RootState) => {
    const lanes = selectLanes(state);
    const selectedLane: LaneMeta = lanes.find((lane: { name: string; }) => lane.name === laneName);
    if (selectedLane === undefined) {
        console.warn("Lane not found");
        return [];
    }
    const dsOfLane = selectDatastreamsOfLane(selectedLane.id)(state);
    return dsOfLane;
};
