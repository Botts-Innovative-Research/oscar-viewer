/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

/** Human-readable duration for latency figures. Shared by LaneStatsTable and the alarm-stats widget. */
export function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "—";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}
