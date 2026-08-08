"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {parseAdjudicationStatus} from "@/lib/data/oscar/adjudication/Adjudication";
import {
    AdjudicationByOccupancy,
    applyAdjudication,
    fetchAdjudicationWindow,
} from "@/lib/data/oscar/stats/fetchAdjudicationWindow";
import {LaneStreamRegistry} from "@/lib/data/oscar/streams/LaneStreamRegistry";

export type {AdjudicationByOccupancy};

/**
 * Fallback report-time window when a caller has no bound of its own. Measured
 * per lane on the reference node: ~1.2k-2.7k COMPLETED statuses in 24h against
 * 9.2k-10k+ for all of the node's 30-day retention.
 *
 * Callers that know how far back their rows go should pass `startIso` instead
 * — anything adjudicated outside the window reads as "Not Adjudicated".
 */
export const DEFAULT_ADJ_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export interface AdjudicationMapOptions {
    /**
     * Start of the report-time window (ISO). Must be no later than the oldest
     * occupancy the caller cares about: report time is when the adjudication
     * was made, and an occupancy can only be adjudicated after it happened.
     */
    startIso?: string;
    /** End of the report-time window (ISO). Defaults to now, resolved per fetch. */
    endIso?: string;
    /** laneMap keys to cover. Omit for every lane in the map. */
    laneIds?: string[];
}

/**
 * Latest adjudication per occupancy observation id, seeded from a bounded
 * report-time window and kept current from the lane's adjudication command
 * status stream.
 *
 * Two things here used to be actively harmful and are worth not reintroducing:
 *
 *  1. The seed paginated every COMPLETED status the node had ever recorded, at
 *     page size 100, on every mount — hundreds of sequential round-trips per
 *     lane. It is now bounded by a report-time window and drained through the
 *     shared pool in fetchAdjudicationWindow (which the alarm-stats widget
 *     already used for exactly this reason).
 *
 *  2. The live half built a per-lane ConSysApi, connected it, and disconnected
 *     it on effect cleanup — over the *shared* MQTT connection. osh-js treats
 *     disconnect as a one-way door (see the LaneStreamRegistry class comment),
 *     so a react-grid-layout breakpoint remount, i.e. an ordinary window
 *     resize, permanently killed live adjudications until a page reload. It
 *     now goes through the registry's ref-counted 'adjStatusRT' channel, which
 *     never disconnects.
 *
 * The map accumulates rather than resetting between fetches: entries are
 * statements about specific occupancies that stay true, so widening the window
 * (paging back through history) must not blink previously-known adjudications
 * back to "Not Adjudicated" while the refetch is in flight.
 */
export function useAdjudicationMap(
    laneMap: Map<string, LaneMapEntry>,
    enabled: boolean,
    options?: AdjudicationMapOptions,
): AdjudicationByOccupancy {
    const [adjudicationMap, setAdjudicationMap] = useState<AdjudicationByOccupancy>(new Map());
    const mapRef = useRef<AdjudicationByOccupancy>(new Map());
    const bundleIdRef = useRef<string>(`adjudication-map-${randomUUID()}`);

    const publishMap = useCallback(() => {
        setAdjudicationMap(new Map(mapRef.current));
    }, []);

    const startIso = options?.startIso;
    const endIso = options?.endIso;
    // Callers rebuild the array every render; key the effects on its contents.
    const requestedLaneKey = options?.laneIds ? options.laneIds.join(',') : '';

    const laneIds = useMemo(() => {
        if (!laneMap) return [];
        if (!options?.laneIds) return [...laneMap.keys()];
        return options.laneIds.filter((id) => laneMap.has(id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [laneMap, requestedLaneKey]);

    const laneKey = laneIds.join(',');

    // Historical seed, bounded by the report-time window.
    useEffect(() => {
        if (!enabled || laneIds.length === 0) return;

        let cancelled = false;
        const start = startIso ?? new Date(Date.now() - DEFAULT_ADJ_LOOKBACK_MS).toISOString();
        const end = endIso ?? new Date().toISOString();

        (async () => {
            try {
                const fetched = await fetchAdjudicationWindow(laneMap, laneIds, start, end, () => cancelled);
                if (cancelled) return;
                // Merge rather than replace: a live status that landed while the
                // fetch was in flight is newer than anything the window can
                // return, and applyAdjudication keeps the later report.
                for (const adj of fetched.values()) applyAdjudication(mapRef.current, adj);
            } catch (err) {
                console.error("useAdjudicationMap: failed to fetch statuses", err);
            }
            // Published even when empty: consumers use the first publish as the
            // "adjudication state is known" signal (see useMobileDetectors).
            if (!cancelled) publishMap();
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, laneMap, laneKey, startIso, endIso, publishMap]);

    // Live adjudications via the shared, ref-counted registry channel.
    useEffect(() => {
        const bundleId = bundleIdRef.current;
        if (!enabled || laneIds.length === 0) {
            LaneStreamRegistry.release(bundleId);
            return;
        }

        LaneStreamRegistry.acquire(bundleId, laneMap, laneIds, ['adjStatusRT'], (_laneId, _stream, message) => {
            let changed = false;
            for (const value of message?.values ?? []) {
                const adj = parseAdjudicationStatus(value?.data);
                if (adj) {
                    applyAdjudication(mapRef.current, adj);
                    changed = true;
                }
            }
            if (changed) publishMap();
        });

        return () => {
            LaneStreamRegistry.release(bundleId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, laneMap, laneKey, publishMap]);

    return adjudicationMap;
}
