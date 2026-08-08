/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useEffect, useRef} from "react";
import {LANE_COMMS_SWEEP_MS} from "./LaneStreamRegistry";

/**
 * Run a comms-staleness check while mounted: immediately, on an interval, and
 * on tab refocus (hidden-tab timers are throttled to ~1/min, so the
 * visibilitychange re-run catches up the moment the operator looks again).
 * The callback must recompute from Date.now()/LaneStreamRegistry each run —
 * nothing accumulates between ticks, so a delayed tick can only delay the
 * verdict, never corrupt it. Callback identity may change freely between
 * renders (kept in a ref, same pattern as useLaneStreams).
 */
export function useStalenessSweep(check: () => void, enabled: boolean = true) {
    const checkRef = useRef(check);
    checkRef.current = check;

    useEffect(() => {
        if (!enabled) return;
        const run = () => checkRef.current();
        run();
        const interval = setInterval(run, LANE_COMMS_SWEEP_MS);
        const onVisibilityChange = () => {
            if (!document.hidden) run();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [enabled]);
}
