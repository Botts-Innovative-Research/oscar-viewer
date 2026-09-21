import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {INode} from "@/lib/data/osh/Node";

export interface LaneDiscoveryResult {
    laneMap: Map<string, LaneMapEntry>;
    failures: Array<{node: INode; reason: unknown}>;
}

function mergeNodeLanes(
    allLanes: Map<string, LaneMapEntry>,
    node: INode,
    nodeLaneMap: Map<string, LaneMapEntry>,
) {
    nodeLaneMap.forEach((value, key) => {
        if (!allLanes.has(key)) {
            allLanes.set(key, value);
            return;
        }

        const prefixedKey = `${node.name} - ${key}`;
        value.setLaneName(prefixedKey);
        allLanes.set(prefixedKey, value);

        const existing = allLanes.get(key);
        if (existing) {
            const existingPrefixedKey = `${existing.parentNode.name} - ${key}`;
            existing.setLaneName(existingPrefixedKey);
            allLanes.set(existingPrefixedKey, existing);
            allLanes.delete(key);
        }
    });
}

/**
 * Discovers each node independently and publishes a snapshot as soon as that
 * node is usable. A slow or failed node never withholds lanes from healthy
 * nodes while the remaining discovery work settles.
 */
export async function discoverLanesIncrementally(
    nodes: INode[],
    publish: (laneMap: Map<string, LaneMapEntry>) => void,
): Promise<LaneDiscoveryResult> {
    const allLanes = new Map<string, LaneMapEntry>();

    const settled = await Promise.allSettled(nodes.map(async (node) => {
        const nodeLaneMap = await node.fetchLaneSystemsAndSubsystems();
        if (!nodeLaneMap)
            return;

        // These API queries are independent and can safely run together.
        await Promise.all([
            node.fetchDataStreams(nodeLaneMap),
            node.fetchLaneControlStreams(nodeLaneMap),
        ]);

        for (const [key, mapEntry] of nodeLaneMap.entries()) {
            try {
                mapEntry.addDefaultConSysApis();
            } catch (error) {
                console.error(`[ERROR] addDefaultConSysApis failed for ${key}:`, error);
            }
        }

        mergeNodeLanes(allLanes, node, nodeLaneMap);
        publish(new Map(allLanes));
    }));

    const failures: Array<{node: INode; reason: unknown}> = [];
    settled.forEach((result, index) => {
        if (result.status === "rejected")
            failures.push({node: nodes[index], reason: result.reason});
    });

    return {laneMap: new Map(allLanes), failures};
}
