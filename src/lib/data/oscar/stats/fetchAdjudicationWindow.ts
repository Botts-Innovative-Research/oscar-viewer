/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isAdjudicationControlStream} from "@/lib/data/oscar/Utilities";
import AdjudicationData, {parseAdjudicationStatus} from "@/lib/data/oscar/adjudication/Adjudication";
import {ADJ_PAGE_SIZE, POOL} from "./alarmStatsTypes";

export type AdjudicationByOccupancy = Map<string, AdjudicationData>;

/** Latest report wins for a given occupancy. */
export function applyAdjudication(map: AdjudicationByOccupancy, adj: AdjudicationData) {
    const key = adj.occupancyObsId;
    if (!key) return;
    const existing = map.get(key);
    if (!existing || new Date(adj.time).getTime() >= new Date(existing.time).getTime()) {
        map.set(key, adj);
    }
}

/**
 * Adjudications (COMPLETED command statuses) for the given lanes, bounded to a
 * report-time window. Shared by the alarm-stats widget and useAdjudicationMap.
 *
 * The window is not an optimization detail, it is the whole point: unbounded,
 * this walks every COMPLETED status the node has ever kept. Measured per lane
 * on the reference node (30-day retention): 9.2k-10k+ statuses in total,
 * against 1.2k-2.7k in the last 24h and 4.2k-9.7k in the last 7d. At a page
 * size of 100 that was ~93-210 sequential round-trips per lane per mount; a
 * 24h window at ADJ_PAGE_SIZE is 2-3.
 *
 * `reportTime` is not a declared ControlStreamFilter field, but
 * ConnectedSystemsApiFilter.toQueryString emits every property verbatim — the
 * same mechanism that passes `statusCode` through. Verified against the node:
 * a 2020 one-minute window returns 0 items and a 24h window returns only
 * in-window items, so the server really is filtering rather than ignoring it.
 *
 * Callers pick the window from their own semantics. Note that report time is
 * when the adjudication was *made*, not when the occupancy happened: to decide
 * "is this occupancy adjudicated?" the window must start no later than the
 * oldest occupancy in question and run to now, since an occupancy can only be
 * adjudicated after it occurred.
 */
export async function fetchAdjudicationWindow(
    laneMap: Map<string, LaneMapEntry>,
    laneIds: string[],
    startIso: string,
    endIso: string,
    isCancelled: () => boolean,
): Promise<AdjudicationByOccupancy> {
    const map: AdjudicationByOccupancy = new Map();

    async function drainLane(laneId: string) {
        const entry = laneMap.get(laneId);
        if (!entry) return;

        const controlStream: typeof ControlStream | undefined =
            entry.controlStreams?.find((cs: any) => isAdjudicationControlStream(cs));
        if (!controlStream) return;

        try {
            const statuses = await controlStream.searchStatus(
                new ControlStreamFilter({
                    statusCode: "COMPLETED",
                    reportTime: `${startIso}/${endIso}`,
                }),
                ADJ_PAGE_SIZE,
            );

            while (statuses.hasNext()) {
                if (isCancelled()) return;
                const page = await statuses.nextPage();
                for (const status of page ?? []) {
                    const adj = parseAdjudicationStatus(status);
                    if (adj) applyAdjudication(map, adj);
                }
            }
        } catch (err) {
            console.warn(`[adjudication] status fetch failed for lane ${laneId}`, err);
        }
    }

    // Lanes in parallel, bounded by the same pool as the observation seed. This
    // is the dominant cost of the adjudication views: a busy site can carry a
    // few thousand COMPLETED statuses per lane per day, i.e. several pages each.
    for (let i = 0; i < laneIds.length; i += POOL) {
        if (isCancelled()) return map;
        await Promise.all(laneIds.slice(i, i + POOL).map(drainLane));
    }

    return map;
}
