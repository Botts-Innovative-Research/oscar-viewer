import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isHLSVideoControlStream} from "@/lib/data/oscar/Utilities";

export function getUniqueVideoControlStreams(
    laneEntry: Pick<LaneMapEntry, "controlStreams"> | null | undefined,
): typeof ControlStream[] {
    if (!laneEntry || !Array.isArray(laneEntry.controlStreams))
        return [];

    const seenIds = new Set<string>();
    return laneEntry.controlStreams.filter((stream: typeof ControlStream) => {
        if (!isHLSVideoControlStream(stream))
            return false;

        const id = stream?.properties?.id;
        if (typeof id !== "string" || seenIds.has(id))
            return false;

        seenIds.add(id);
        return true;
    });
}
