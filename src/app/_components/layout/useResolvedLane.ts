/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useSelector} from "react-redux";
import {selectCurrentLane} from "@/lib/state/LaneViewSlice";
import {LaneSource, PageConfig} from "@/lib/layout/PageConfigTypes";

/**
 * Resolve the lane a single-lane widget is bound to:
 * explicit widget config > page's fixed lane > global current lane
 * (the seeded Lane View page mirrors LaneViewSlice.currentLane).
 */
export function useResolvedLane(page: PageConfig | undefined, laneSource: LaneSource | undefined): string | null {
    const globalCurrentLane = useSelector(selectCurrentLane);

    if (laneSource?.source === 'explicit' && laneSource.lane) return laneSource.lane;

    const ctx = page?.laneContext;
    if (ctx?.mode === 'fixed' && ctx.lane) return ctx.lane;

    return globalCurrentLane ?? null;
}
