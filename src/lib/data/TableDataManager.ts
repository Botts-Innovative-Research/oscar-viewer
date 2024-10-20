/*
 * Copyright (c) 2024.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import ObservationFilter from "osh-js/source/core/sweapi/observation/ObservationFilter";
import DataStream from "osh-js/source/core/sweapi/datastream/DataStream";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {randomUUID} from "osh-js/source/core/utils/Utils";

// This class is currently unused, but can replace the logic in the TableType2 component with a little work
// doing that would help a few debugging situations and potentially let us decouple a few things but for now the onus
// is to get things functional

export class TableDataManager {
    tableDataHandler: (shouldAddDataPerEntry: boolean, observationsList: any[]) => {}

    constructor(tableDataHandler: any) {
        this.tableDataHandler = tableDataHandler;
    }

    async fetchObservations(laneEntry: LaneMapEntry, timeStart: string, timeEnd: string) {
        const observationFilter = new ObservationFilter({resultTime: `${timeStart}/${timeEnd}`});
        let occDS: typeof DataStream = laneEntry.findDataStreamByName("Driver - Occupancy");
        if (!occDS) {
            return;
        }
        let obsCollection = await occDS.searchObservations(observationFilter, 250000);
        let observations = await this.handleObservations(obsCollection, laneEntry, false);
        return observations;
    }

    async streamObservations(laneEntry: LaneMapEntry) {
        const observationFilter = new ObservationFilter({resultTime: `${new Date().toISOString()}/..`});
        let futureTime = new Date();
        futureTime.setFullYear(futureTime.getFullYear() + 1);
        let occDS: typeof DataStream = laneEntry.findDataStreamByName("Driver - Occupancy");
        if (!occDS) return;
        occDS.streamObservations(new ObservationFilter({
            resultTime: `now/${futureTime.toISOString()}`,
            replaySpeed: 1
        }), (observation: any) => {
            let resultEvent = this.eventFromObservation(observation[0], laneEntry);
            this.tableDataHandler(true, [resultEvent]);
        })
    }

    async handleObservations(obsCollection: Collection<JSON>, laneEntry: LaneMapEntry, addToLog: boolean = true): Promise<EventTableData[]> {
        let observations: EventTableData[] = [];
        while (obsCollection.hasNext()) {
            let obsResults = await obsCollection.nextPage();
            obsResults.map((obs: any) => {
                let result = this.eventFromObservation(obs, laneEntry);
                observations.push(result);
            })
        }
        return observations;
    }


    eventFromObservation(obs: any, laneEntry: LaneMapEntry): EventTableData {
        let newEvent: EventTableData = new EventTableData(randomUUID(), laneEntry.laneName, obs.result, obs["datastream@id"]);
        newEvent.setSystemIdx(laneEntry.lookupSystemIdFromDataStreamId(obs.result.datastreamId));
        newEvent.setObservationId(obs.id);

        return newEvent;
    }

    async doFetch(laneMap: Map<string, LaneMapEntry>) {
        let allFetchedResults: EventTableData[] = [];
        let promiseGroup: Promise<void>[] = [];

        laneMap.forEach((entry: LaneMapEntry, laneName: string) => {
            let promise = (async () => {
                let startTimeForObs = new Date();
                startTimeForObs.setFullYear(startTimeForObs.getFullYear() - 1);
                let fetchedResults = await this.fetchObservations(entry, startTimeForObs.toISOString(), 'now')
                allFetchedResults = [...allFetchedResults, ...fetchedResults];
            })();
            promiseGroup.push(promise);
        });
        await Promise.all(promiseGroup);
        this.tableDataHandler(false, allFetchedResults);
    }

    async doStream(laneMap: Map<string, LaneMapEntry>) {
        laneMap.forEach((entry) => {
            this.streamObservations(entry);
        })
    }


    static unadjudicatedFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        let filtered = tableData.filter((entry) => entry.adjudicatedData.getCodeValue() === 0)
        return filtered
    }

    static onlyAlarmingFilteredList(tableData: EventTableData[]) {
        if (!tableData) return [];
        let filtered = tableData.filter((entry: EventTableData) => entry.status !== 'None')
        return filtered
    }

    static onlyLaneFilteredList(tableData: EventTableData[], laneId: string) {
        if (!tableData) return [];
        let filtered = tableData.filter((entry: EventTableData) => entry.laneId == laneId)
        return filtered
    }
}
