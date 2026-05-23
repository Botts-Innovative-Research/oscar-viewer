"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LaneMapEntry } from "@/lib/data/oscar/LaneCollection";
import { isAdjudicationControlStream } from "@/lib/data/oscar/Utilities";
import AdjudicationData, { parseAdjudicationStatus } from "@/lib/data/oscar/adjudication/Adjudication";
import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import ControlStreamFilter from "osh-js/source/core/consysapi/controlstream/ControlStreamFilter";
import { EventType } from "osh-js/source/core/event/EventType";

export type AdjudicationByOccupancy = Map<string, AdjudicationData>;

function applyAdjudication(map: AdjudicationByOccupancy, adj: AdjudicationData) {
    const key = adj.occupancyObsId;
    if (!key) return;

    const existing = map.get(key);
    if (!existing) {
        map.set(key, adj);
        return;
    }

    const existingTime = new Date(existing.time).getTime();
    const incomingTime = new Date(adj.time).getTime();
    if (incomingTime >= existingTime) {
        map.set(key, adj);
    }
}

export function useAdjudicationMap(
    laneMap: Map<string, LaneMapEntry>,
    enabled: boolean
): AdjudicationByOccupancy {
    const [adjudicationMap, setAdjudicationMap] = useState<AdjudicationByOccupancy>(new Map());
    const mapRef = useRef<AdjudicationByOccupancy>(new Map());

    const publishMap = useCallback(() => {
        setAdjudicationMap(new Map(mapRef.current));
    }, []);

    useEffect(() => {
        if (!enabled || !laneMap || laneMap.size === 0) return;

        let cancelled = false;
        mapRef.current = new Map();

        const fetchAll = async () => {
            for (const entry of laneMap.values()) {
                const controlStream: typeof ControlStream | undefined =
                    entry.controlStreams.find((cs: any) => isAdjudicationControlStream(cs));
                if (!controlStream) continue;

                try {
                    const commandStatuses = await controlStream.searchStatus(
                        new ControlStreamFilter({ statusCode: "COMPLETED" }),
                        100
                    );

                    while (commandStatuses.hasNext()) {
                        if (cancelled) return;
                        const cmdRes = await commandStatuses.nextPage();
                        for (const obs of cmdRes) {
                            const adj = parseAdjudicationStatus(obs);
                            if (adj) applyAdjudication(mapRef.current, adj);
                        }
                    }
                } catch (err) {
                    console.error("useAdjudicationMap: failed to fetch statuses", err);
                }
            }
            if (!cancelled) publishMap();
        };

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [laneMap, enabled, publishMap]);

    useEffect(() => {
        if (!enabled || !laneMap || laneMap.size === 0) return;

        const sources: any[] = [];

        for (const entry of laneMap.values()) {
            const controlStream: typeof ControlStream | undefined =
                entry.controlStreams.find((cs: any) => isAdjudicationControlStream(cs));
            if (!controlStream) continue;

            const source = entry.createRealTimeConSysApi(controlStream);
            if (!source) continue;

            const handler = (data: any) => {
                const values = data?.values ?? [];
                let changed = false;
                for (const value of values) {
                    const statusData = value?.data;
                    const adj = parseAdjudicationStatus(statusData);
                    if (adj) {
                        applyAdjudication(mapRef.current, adj);
                        changed = true;
                    }
                }
                if (changed) publishMap();
            };

            source.subscribe(handler, [EventType.DATA]);
            try {
                source.connect();
                sources.push(source);
            } catch (err) {
                console.error("useAdjudicationMap: failed to connect realtime source", err);
            }
        }

        return () => {
            for (const source of sources) {
                try {
                    source.disconnect?.();
                } catch {
                    // noop
                }
            }
        };
    }, [laneMap, enabled, publishMap]);

    return adjudicationMap;
}
