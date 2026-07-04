/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useContext, useEffect, useMemo, useRef} from "react";
import {useSelector} from "react-redux";
import {randomUUID} from "osh-js/source/core/utils/Utils";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";
import {LaneSelection} from "@/lib/layout/PageConfigTypes";
import {
    LaneStreamHandler,
    LaneStreamName,
    LaneStreamRegistry,
    resolveLaneSelection,
} from "./LaneStreamRegistry";

/**
 * Subscribe to realtime lane streams through the shared LaneStreamRegistry.
 * Handlers are automatically released on unmount. The handler identity may
 * change freely between renders (kept in a ref); lane selection and stream
 * list changes re-acquire.
 */
export function useLaneStreams(
    selection: LaneSelection,
    streams: LaneStreamName[],
    onMessage: LaneStreamHandler,
    enabled: boolean = true,
): { laneIds: string[] } {
    const {laneMapRef} = useContext(DataSourceContext);
    // Re-render trigger: redux laneMap is populated/replaced by DataSourceContext.
    const laneMapFromStore = useSelector((state: RootState) => selectLaneMap(state));

    const bundleIdRef = useRef<string>(`lane-streams-${randomUUID()}`);
    const onMessageRef = useRef<LaneStreamHandler>(onMessage);
    onMessageRef.current = onMessage;

    const selectionKey = JSON.stringify(selection);
    const streamsKey = streams.join(',');
    const laneMapSize = laneMapFromStore?.size ?? 0;

    const laneIds = useMemo(
        () => resolveLaneSelection(selection, laneMapRef.current),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectionKey, laneMapSize, laneMapRef]
    );

    useEffect(() => {
        const bundleId = bundleIdRef.current;
        if (!enabled || laneIds.length === 0) {
            LaneStreamRegistry.release(bundleId);
            return;
        }
        const stableHandler: LaneStreamHandler = (laneId, stream, message) =>
            onMessageRef.current(laneId, stream, message);
        LaneStreamRegistry.acquire(bundleId, laneMapRef.current, laneIds, streams as LaneStreamName[], stableHandler);
        return () => {
            LaneStreamRegistry.release(bundleId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, selectionKey, streamsKey, laneMapSize]);

    return {laneIds};
}
