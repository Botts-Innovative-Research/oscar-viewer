/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {INode} from "@/lib/data/osh/Node";
import {BUCKET_MS} from "./alarmStatsTypes";

export interface CountInterval {
    startMs: number;
    endMs: number;
}

/**
 * Intervals for the count-based profile seed.
 *
 * Day buckets ('1d') are aligned to LOCAL midnight via Date arithmetic, not
 * `floor(t / 86400000)` — a UTC-day floor would attribute up to a whole
 * timezone-offset's worth of traffic to the wrong weekday. Only COMPLETE local
 * days are included: a day in progress counted as a full occurrence would
 * visibly understate its weekday (today-so-far averaged as a whole day).
 * Stepping with setDate() keeps 23h/25h DST days as single intervals.
 *
 * Hour buckets include the clipped partial hours at both window edges — one
 * partial hour among >=24 dilutes its bin only slightly, and this matches the
 * observation-path behavior the profile had before. (Complete-hours-only would
 * instead blank the bin containing "now", which roves with the clock.)
 */
export function buildProfileIntervals(
    bucketMs: number,
    windowStartMs: number,
    windowEndMs: number,
): CountInterval[] {
    const out: CountInterval[] = [];

    if (bucketMs === BUCKET_MS['1d']) {
        const first = new Date(windowStartMs);
        first.setHours(0, 0, 0, 0);
        if (first.getTime() < windowStartMs) first.setDate(first.getDate() + 1);

        const lastMidnight = new Date(windowEndMs);
        lastMidnight.setHours(0, 0, 0, 0);

        const d = new Date(first);
        while (d.getTime() < lastMidnight.getTime()) {
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            out.push({startMs: d.getTime(), endMs: Math.min(next.getTime(), lastMidnight.getTime())});
            d.setDate(d.getDate() + 1);
        }

        // Window shorter than one complete local day (a degenerate config for
        // day-of-week, but selectable): fall back to the partial day(s) clipped
        // to the window so the chart isn't empty. Normalization will treat each
        // as a full day, mildly understating the average — same flaw the
        // observation path had.
        if (out.length === 0) {
            const midnight = new Date(windowStartMs);
            midnight.setHours(0, 0, 0, 0);
            midnight.setDate(midnight.getDate() + 1);
            const splitMs = midnight.getTime();
            if (splitMs >= windowEndMs) {
                out.push({startMs: windowStartMs, endMs: windowEndMs});
            } else {
                out.push({startMs: windowStartMs, endMs: splitMs});
                out.push({startMs: splitMs, endMs: windowEndMs});
            }
        }
        return out;
    }

    // Hourly (or finer): floor-aligned steps, edges clipped to the window.
    for (let t = Math.floor(windowStartMs / bucketMs) * bucketMs; t < windowEndMs; t += bucketMs) {
        const startMs = Math.max(t, windowStartMs);
        const endMs = Math.min(t + bucketMs, windowEndMs);
        if (endMs > startMs) out.push({startMs, endMs});
    }
    return out;
}

/**
 * One `/observations/count` call, mirroring EventTable.fetchTotalCount. The
 * endpoint answers in ~0.02s regardless of how many observations it counts,
 * which is what makes the count-based profile seed viable where paginating
 * the observations themselves hits the OBS_CAP.
 *
 * Throws on any failure — the caller must be able to distinguish "count is 0"
 * (real coverage, no traffic) from "query failed" (no coverage claim).
 */
export async function fetchObservationCount(
    node: INode,
    datastreamIds: string[],
    startIso: string,
    endIso: string,
    filter?: string,
): Promise<number> {
    const params = new URLSearchParams({
        format: "application/om+json",
        dataStream: datastreamIds.join(","),
        resultTime: `${startIso}/${endIso}`,
    });
    if (filter) params.set("filter", filter);

    const response = await fetch(`${node.getConnectedSystemsEndpoint(false)}/observations/count?${params}`, {
        method: 'GET',
        headers: {...node.getBasicAuthHeader()},
        mode: "cors",
    });
    if (!response.ok) throw new Error(`count query failed: HTTP ${response.status}`);

    const json = await response.json();
    if (typeof json?.count !== 'number') throw new Error('count query returned no count field');
    return json.count;
}
