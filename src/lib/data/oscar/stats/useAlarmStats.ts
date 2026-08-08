"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useCallback, useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import {convertToMap} from "@/app/utils/Utils";
import {AlarmStatsBucket, AlarmStatsWindow, LaneSelection} from "@/lib/layout/PageConfigTypes";
import {resolveLaneSelection} from "@/lib/data/oscar/streams/LaneStreamRegistry";
import {AlarmStatsRegistry} from "./AlarmStatsRegistry";
import {AlarmStatsResult, AlarmStatsSnapshot, EMPTY_TOTALS, resolveBucketMs, WINDOW_SPAN_MS} from "./alarmStatsTypes";

export interface UseAlarmStatsOptions {
    lanes: LaneSelection;
    window: AlarmStatsWindow;
    bucket: AlarmStatsBucket;
    /**
     * Whether time-to-adjudicate is needed. False for the rate-trend chart,
     * which then skips the control-stream fetch entirely — the most expensive
     * part of the pipeline.
     */
    needAdjudication: boolean;
    liveAppend: boolean;
    refreshSec: number;
    enabled?: boolean;
}

function idleSnapshot(window: AlarmStatsWindow, bucket: AlarmStatsBucket): AlarmStatsSnapshot {
    const end = Date.now();
    return {
        buckets: [],
        byLane: [],
        laneSeries: [],
        totals: {...EMPTY_TOTALS},
        adjSamplesSec: [],
        windowStartMs: end - (WINDOW_SPAN_MS[window] ?? WINDOW_SPAN_MS['24h']),
        windowEndMs: end,
        bucketMs: resolveBucketMs(window, bucket),
        loading: false,
        refreshing: false,
        capped: false,
        fetchedCount: 0,
        error: null,
    };
}

/**
 * Bucketed occupancy/alarm/adjudication statistics for a lane selection.
 *
 * This is a thin binding: all the work (paginated seed, reduction, live append
 * via the occRT streams, rolling-window maintenance) lives in the module-level
 * AlarmStatsRegistry so that several widgets configured the same way share one
 * fetch and one live subscription.
 */
export function useAlarmStats(opts: UseAlarmStatsOptions): AlarmStatsResult {
    const {lanes, window, bucket, needAdjudication, liveAppend, refreshSec, enabled = true} = opts;

    const {laneMapRef} = useContext(DataSourceContext);
    // Re-render trigger: DataSourceContext populates/replaces the redux laneMap.
    const laneMapRaw = useSelector((state: RootState) => selectLaneMap(state));
    const laneMap = useMemo(() => convertToMap(laneMapRaw), [laneMapRaw]);

    const subscriberIdRef = useRef<string>(`alarm-stats-${randomUUID()}`);
    const [snapshot, setSnapshot] = useState<AlarmStatsSnapshot>(() => idleSnapshot(window, bucket));

    const laneIds = useMemo(
        () => resolveLaneSelection(lanes ?? {mode: 'all'}, laneMap ?? laneMapRef.current),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(lanes), laneMap, laneMapRef],
    );
    const laneKey = laneIds.join(',');

    useEffect(() => {
        const subscriberId = subscriberIdRef.current;
        if (!enabled || laneIds.length === 0) {
            AlarmStatsRegistry.release(subscriberId);
            setSnapshot(idleSnapshot(window, bucket));
            return;
        }

        AlarmStatsRegistry.setLaneMap(laneMap ?? laneMapRef.current);
        const initial = AlarmStatsRegistry.acquire(
            subscriberId,
            {lanes: laneIds, window, bucket, needAdjudication, liveAppend, refreshSec},
            setSnapshot,
        );
        setSnapshot(initial);

        return () => {
            AlarmStatsRegistry.release(subscriberId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, laneKey, window, bucket, needAdjudication, liveAppend, refreshSec, laneMap]);

    const refresh = useCallback(() => {
        AlarmStatsRegistry.refresh(subscriberIdRef.current);
    }, []);

    return {...snapshot, laneCount: laneIds.length, refresh};
}
