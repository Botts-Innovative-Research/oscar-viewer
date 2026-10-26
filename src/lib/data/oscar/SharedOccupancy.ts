import {INode} from "@/lib/data/osh/Node";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {isOccupancyDataStream} from "@/lib/data/oscar/Utilities";
import {hashString} from "@/app/utils/Utils";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";

export class SharedOccupancyError extends Error {
    constructor(public readonly translationKey: string) {
        super(translationKey);
    }
}

function endpoint(node: INode): string {
    // Normalize default ports and trailing slashes for recipients' node settings.
    return new URL(node.getConnectedSystemsEndpoint(false)).href.replace(/\/$/, "");
}

export function occupancyDetailsPath(id: string, node: INode): string {
    return `/event-details/?${new URLSearchParams({id, node: endpoint(node)})}`;
}

/** Only query configured nodes; a shared URL cannot introduce a new API endpoint. */
export async function loadSharedOccupancy(
    id: string,
    source: string | null,
    nodes: INode[],
    lanes: Map<string, LaneMapEntry>,
    signal?: AbortSignal,
): Promise<EventTableData> {
    const candidates = nodes.filter(node => !source || endpoint(node) === source.replace(/\/$/, ""));
    if (!candidates.length) throw new SharedOccupancyError("sharedOccupancyNodeUnavailable");

    const results = await Promise.all(candidates.map(async node => {
        const response = await fetch(`${endpoint(node)}/observations/${encodeURIComponent(id)}`, {
            credentials: "include",
            headers: {Accept: "application/om+json", ...node.getBasicAuthHeader()},
            signal,
        });
        if (response.status === 404) return null;
        if (response.status === 401 || response.status === 403)
            throw new SharedOccupancyError("sharedOccupancyAccessDenied");
        if (!response.ok) throw new SharedOccupancyError("sharedOccupancyLoadFailed");
        const observation = await response.json();
        const properties = observation.properties ?? observation;
        const streamId = properties["datastream@id"];
        const match = Array.from(lanes.entries()).find(([, lane]) =>
            endpoint(lane.parentNode) === endpoint(node) && lane.datastreams.some((stream: any) =>
                stream.properties.id === streamId && isOccupancyDataStream(stream)));
        if (!match) throw new SharedOccupancyError("sharedOccupancyLaneUnavailable");
        const [laneName, lane] = match;
        const result = properties.result;
        if (!result?.startTime || !result?.endTime || result.occupancyCount == null)
            throw new SharedOccupancyError("sharedOccupancyLoadFailed");
        const event = new EventTableData(
            hashString(`${endpoint(node)}:${id}`), laneName, result, id,
            properties["foi@id"] ?? properties.foiId, node.name, lane.isRS350Backpack,
        );
        event.setDataStreamId(streamId);
        event.setLaneSystemId(lane.laneSystem?.properties.id);
        const stream = lane.datastreams.find((stream: any) => stream.properties.id === streamId);
        event.setRPMSystemId(stream.properties["system@id"]);
        return event;
    }));
    const found = results.filter((event): event is EventTableData => event !== null);
    if (!found.length) throw new SharedOccupancyError("sharedOccupancyNotFound");
    if (found.length > 1) throw new SharedOccupancyError("sharedOccupancyAmbiguous");
    return found[0];
}

/** Live MQTT records may not yet include their persisted observation ID. */
export async function resolveOccupancyId(event: EventTableData, lane: LaneMapEntry): Promise<string> {
    if (event.occupancyObsId) return event.occupancyObsId;
    const streams = lane.datastreams.filter((stream: any) => isOccupancyDataStream(stream)
        && (!event.dataStreamId || stream.properties.id === event.dataStreamId));
    const matches = await Promise.all(streams.map(async (stream: any) => {
        const query = await stream.searchObservations(new ObservationFilter({
            filter: `startTime='${new Date(event.startTime).toISOString()}' AND endTime='${new Date(event.endTime).toISOString()}'`,
        }), 2);
        return (await query.nextPage()).filter((observation: any) => {
            const data = observation.properties ?? observation;
            return String(data.result?.occupancyCount) === String(event.occupancyCount);
        }).map((observation: any) => observation.properties?.id ?? observation.id);
    }));
    const ids = matches.flat().filter(Boolean);
    if (ids.length !== 1) throw new SharedOccupancyError("shareOccupancyNotStored");
    return ids[0];
}
