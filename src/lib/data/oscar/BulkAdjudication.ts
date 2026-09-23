import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {AdjudicationCode} from "@/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {generateAdjudicationCommandJSON, sendCommand} from "@/lib/data/oscar/OSCARCommands";
import {isAdjudicationControlStream, isOccupancyDataStream} from "@/lib/data/oscar/Utilities";

export interface BulkAdjudicationValues {
    adjudicationCode: AdjudicationCode;
    feedback: string;
    secondaryInspectionStatus: string;
    vehicleId: string;
}

export interface BulkAdjudicationOutcome {
    event: EventTableData;
    ok: boolean;
    error?: string;
}

export async function runWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>,
    onProgress?: (complete: number, total: number) => void,
): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;
    let complete = 0;
    const workerCount = Math.max(1, Math.min(Math.floor(concurrency) || 1, items.length));

    const consume = async () => {
        while (true) {
            const index = cursor++;
            if (index >= items.length) return;
            results[index] = await worker(items[index], index);
            complete += 1;
            onProgress?.(complete, items.length);
        }
    };

    await Promise.all(Array.from({length: workerCount}, consume));
    return results;
}

function findLaneForEvent(laneMap: Map<string, LaneMapEntry>, event: EventTableData): LaneMapEntry | undefined {
    return Array.from(laneMap.values()).find(lane =>
        lane.laneName === event.laneId &&
        (lane.parentNode.name === event.parentNode || lane.parentNode.id === event.parentNode));
}

export async function adjudicateOneEvent(
    event: EventTableData,
    laneMap: Map<string, LaneMapEntry>,
    values: BulkAdjudicationValues,
): Promise<BulkAdjudicationOutcome> {
    try {
        if (event.status === "None")
            return {event, ok: false, error: "notAlarm"};
        if (event.adjudicatedIds?.length > 0)
            return {event, ok: false, error: "alreadyAdjudicated"};

        const lane = findLaneForEvent(laneMap, event);
        if (!lane) return {event, ok: false, error: "laneUnavailable"};

        const dataStream = lane.datastreams.find((stream: any) => stream.properties.id === event.dataStreamId)
            ?? lane.datastreams.find((stream: any) => isOccupancyDataStream(stream));
        if (!dataStream) return {event, ok: false, error: "occupancyStreamMissing"};

        const streams = lane.controlStreams.length > 0
            ? lane.controlStreams
            : await lane.parentNode.fetchNodeControlStreams();
        const controlStream = streams.find((stream: typeof ControlStream) => isAdjudicationControlStream(stream));
        if (!controlStream) return {event, ok: false, error: "controlStreamMissing"};

        let observationId = event.occupancyObsId;
        if (!observationId) {
            const query = await dataStream.searchObservations(new ObservationFilter({
                filter: `startTime='${event.startTime}' AND endTime='${event.endTime}'`,
            }), 1);
            const observations: any[] = await query.nextPage();
            observationId = observations[0]?.id;
            if (!observationId) return {event, ok: false, error: "observationNotFound"};
            event.setOccupancyObsId(observationId);
        }

        const response = await sendCommand(
            lane.parentNode,
            controlStream.properties.id,
            generateAdjudicationCommandJSON(
                values.feedback,
                values.adjudicationCode,
                [],
                values.secondaryInspectionStatus,
                [],
                observationId,
                values.vehicleId,
            ),
        );
        if (!response.ok) return {event, ok: false, error: `http:${response.status}`};
        return {event, ok: true};
    } catch (error) {
        return {event, ok: false, error: error instanceof Error ? error.message : String(error)};
    }
}

export async function adjudicateEvents(
    events: EventTableData[],
    laneMap: Map<string, LaneMapEntry>,
    values: BulkAdjudicationValues,
    onProgress?: (complete: number, total: number) => void,
): Promise<BulkAdjudicationOutcome[]> {
    return runWithConcurrency(events, 6, event => adjudicateOneEvent(event, laneMap, values), onProgress);
}
