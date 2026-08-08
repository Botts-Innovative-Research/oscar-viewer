/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isOccupancyDataStream} from "@/lib/data/oscar/Utilities";
import {AlarmStatsBucket, AlarmStatsWindow} from "@/lib/layout/PageConfigTypes";
import {LaneStreamName, LaneStreamRegistry} from "@/lib/data/oscar/streams/LaneStreamRegistry";
import {fetchAdjudicationWindow} from "./fetchAdjudicationWindow";
import {buildProfileIntervals, fetchObservationCount} from "./fetchObservationCounts";
import {
    AlarmStatsBucketRow,
    AlarmStatsLaneRow,
    AlarmStatsLaneSeries,
    AlarmStatsSeedMode,
    AlarmStatsSnapshot,
    AlarmStatsTotals,
    CACHE_TTL_MS,
    EMPTY_TOTALS,
    OBS_CAP,
    PAGE_SIZE,
    POOL,
    resolveBucketMs,
    WINDOW_SPAN_MS,
} from "./alarmStatsTypes";

export interface AlarmStatsParams {
    lanes: string[];
    window: AlarmStatsWindow;
    bucket: AlarmStatsBucket;
    needAdjudication: boolean;
    liveAppend: boolean;
    refreshSec: number;
    /**
     * 'observations' (default) paginates occupancy rows — rich data, OBS_CAP.
     * 'counts' seeds each bucket from /observations/count — totals only, but
     * uncapped, so long windows get full coverage. Counts mode is seed+refresh
     * only: no live append, no rolling-window tick (its '1d' buckets are
     * local-midnight aligned, which the floor-based slide/prune math must
     * never touch).
     */
    seedMode: AlarmStatsSeedMode;
}

export type AlarmStatsListener = (snapshot: AlarmStatsSnapshot) => void;

const OCC_STREAM: LaneStreamName[] = ['occRT'];
/**
 * Live messages are folded into refs immediately but published on this tick,
 * never per-message: at 50 lanes occRT fires many times a second and a setState
 * per message would kill the page. Same discipline as ScrollingBarChartCore.
 */
const PUBLISH_TICK_MS = 5_000;

interface LaneCounts {
    occupancies: number;
    alarms: number;
    adjudicated: number;
    adjSecondsSum: number;
    adjSecondsCount: number;
}

/**
 * One time bucket. Per-lane counts live *inside* the bucket so that pruning a
 * bucket that fell out of the rolling window automatically removes its
 * contribution from the lane rows and the totals — there is no second
 * aggregate to keep in sync, so it cannot drift.
 */
interface BucketAcc extends AlarmStatsBucketRow {
    perLane: Map<string, LaneCounts>;
    /** Individual time-to-adjudicate samples attributed to this bucket. */
    adjSamples: number[];
}

/** Mutable accumulator; raw observations are never retained. */
interface Accumulator {
    buckets: Map<number, BucketAcc>;
    /** obsId -> where that occupancy landed. Built only when adjudication is needed. */
    occIndex: Map<string, { tMs: number; laneId: string; bucketKey: number }>;
    /** `lane|count|start|end` of everything already counted, so live rows can't double-count. */
    seen: Set<string>;
    fetchedCount: number;
    capped: boolean;
}

interface Entry {
    key: string;
    params: AlarmStatsParams;
    refs: Set<string>;
    listeners: Map<string, AlarmStatsListener>;
    acc: Accumulator;
    snapshot: AlarmStatsSnapshot;
    /** Bumped on every re-seed; a run whose id is stale never commits. */
    runId: number;
    windowStartMs: number;
    windowEndMs: number;
    /**
     * When the observation cap truncated the seed, the timestamp of the oldest
     * observation actually retained. The window may never extend past it — the
     * data simply isn't there, and pretending otherwise would add empty leading
     * buckets that drag down any per-bucket average.
     */
    dataFloorMs: number | null;
    bucketMs: number;
    tickTimer: any;
    refreshTimer: any;
    evictTimer: any;
    liveBound: boolean;
    seeding: boolean;
}

function emptyAcc(): Accumulator {
    return {
        buckets: new Map(),
        occIndex: new Map(),
        seen: new Set(),
        fetchedCount: 0,
        capped: false,
    };
}

function blankBucket(t: number): BucketAcc {
    return {
        t,
        occupancies: 0,
        gammaAlarms: 0,
        neutronAlarms: 0,
        alarms: 0,
        adjudicated: 0,
        adjSecondsSum: 0,
        adjSecondsCount: 0,
        perLane: new Map(),
        adjSamples: [],
    };
}

function laneCounts(bucket: BucketAcc, laneId: string): LaneCounts {
    let c = bucket.perLane.get(laneId);
    if (!c) {
        c = {occupancies: 0, alarms: 0, adjudicated: 0, adjSecondsSum: 0, adjSecondsCount: 0};
        bucket.perLane.set(laneId, c);
    }
    return c;
}

export function alarmStatsKey(p: AlarmStatsParams): string {
    return [
        [...p.lanes].sort().join(','),
        p.window,
        p.bucket,
        p.needAdjudication ? 'adj' : 'noadj',
        p.liveAppend ? 'live' : 'static',
        p.seedMode,
    ].join('|');
}

class AlarmStatsRegistryImpl {
    private entries = new Map<string, Entry>();
    /** Set by the React binding; the registry has no access to redux or context itself. */
    private laneMap: Map<string, LaneMapEntry> = new Map();

    setLaneMap(laneMap: Map<string, LaneMapEntry>) {
        if (laneMap && laneMap.size > 0) this.laneMap = laneMap;
    }

    /**
     * Attach a subscriber to the shared series for these params. The first
     * subscriber for a key starts the seed; later ones get the same snapshot
     * without re-fetching, so N identical widgets on a page cost one fetch.
     */
    acquire(subscriberId: string, params: AlarmStatsParams, listener: AlarmStatsListener): AlarmStatsSnapshot {
        const key = alarmStatsKey(params);

        // Re-pointing a subscriber (config changed): drop it from every other entry.
        for (const [k, entry] of this.entries) {
            if (k !== key) this.detach(entry, subscriberId);
        }

        const existing = this.entries.get(key);
        if (existing) {
            if (existing.evictTimer) {
                clearTimeout(existing.evictTimer);
                existing.evictTimer = null;
            }
            existing.refs.add(subscriberId);
            existing.listeners.set(subscriberId, listener);
            return existing.snapshot;
        }

        const entry = this.createEntry(key, params);
        entry.refs.add(subscriberId);
        entry.listeners.set(subscriberId, listener);
        this.entries.set(key, entry);
        this.startSeed(entry);
        this.startTimers(entry);
        return entry.snapshot;
    }

    release(subscriberId: string) {
        for (const entry of [...this.entries.values()]) {
            this.detach(entry, subscriberId);
        }
    }

    /** Force a re-seed of whichever entry this subscriber is attached to. */
    refresh(subscriberId: string) {
        for (const entry of this.entries.values()) {
            if (entry.refs.has(subscriberId)) this.startSeed(entry);
        }
    }

    private detach(entry: Entry, subscriberId: string) {
        if (!entry.refs.has(subscriberId)) return;
        entry.refs.delete(subscriberId);
        entry.listeners.delete(subscriberId);
        if (entry.refs.size > 0 || entry.evictTimer) return;

        // Keep the data warm briefly: navigating away and back, or toggling a
        // config option and back, shouldn't pay for a full re-fetch.
        entry.evictTimer = setTimeout(() => this.evict(entry), CACHE_TTL_MS);
    }

    private evict(entry: Entry) {
        entry.evictTimer = null;
        if (entry.refs.size > 0) return;
        clearInterval(entry.tickTimer);
        clearInterval(entry.refreshTimer);
        entry.tickTimer = null;
        entry.refreshTimer = null;
        entry.runId++;
        if (entry.liveBound) {
            // Detaches our handler only. LaneStreamRegistry never disconnects
            // the underlying osh-js stream — see its class comment.
            LaneStreamRegistry.release(`alarm-stats-${entry.key}`);
            entry.liveBound = false;
        }
        entry.acc = emptyAcc();
        this.entries.delete(entry.key);
    }

    private createEntry(key: string, params: AlarmStatsParams): Entry {
        const bucketMs = resolveBucketMs(params.window, params.bucket);
        const windowEndMs = Date.now();
        const windowStartMs = windowEndMs - (WINDOW_SPAN_MS[params.window] ?? WINDOW_SPAN_MS['24h']);
        const entry: Entry = {
            key,
            params,
            refs: new Set(),
            listeners: new Map(),
            acc: emptyAcc(),
            snapshot: {
                buckets: [],
                byLane: [],
                laneSeries: [],
                totals: {...EMPTY_TOTALS},
                adjSamplesSec: [],
                windowStartMs,
                windowEndMs,
                bucketMs,
                loading: true,
                refreshing: false,
                capped: false,
                fetchedCount: 0,
                error: null,
            },
            runId: 0,
            windowStartMs,
            windowEndMs,
            dataFloorMs: null,
            bucketMs,
            tickTimer: null,
            refreshTimer: null,
            evictTimer: null,
            liveBound: false,
            seeding: false,
        };
        // Counts mode creates a bucket only for intervals that were actually
        // queried successfully — coverage IS the bucket set, so no pre-fill.
        if (params.seedMode !== 'counts') this.seedBucketRange(entry);
        return entry;
    }

    /** Pre-create every bucket in the window so the series is dense (no holes in the line). */
    private seedBucketRange(entry: Entry) {
        const first = Math.floor(entry.windowStartMs / entry.bucketMs) * entry.bucketMs;
        const last = Math.floor(entry.windowEndMs / entry.bucketMs) * entry.bucketMs;
        for (let t = first; t <= last; t += entry.bucketMs) {
            if (!entry.acc.buckets.has(t)) entry.acc.buckets.set(t, blankBucket(t));
        }
    }

    private startTimers(entry: Entry) {
        // Counts mode has no live stream to publish and no rolling window to
        // slide — the whole series is replaced on each re-seed instead.
        if (entry.params.seedMode !== 'counts') {
            entry.tickTimer = setInterval(() => this.advanceWindow(entry), PUBLISH_TICK_MS);
        }
        const refreshSec = entry.params.refreshSec ?? 300;
        if (refreshSec > 0) {
            entry.refreshTimer = setInterval(() => this.startSeed(entry), refreshSec * 1000);
        }
    }

    // ---------------------------------------------------------------- seeding

    private startSeed(entry: Entry) {
        if (entry.seeding) return;
        const runId = ++entry.runId;
        entry.seeding = true;

        const isFirst = entry.snapshot.loading;
        entry.snapshot = {...entry.snapshot, loading: isFirst, refreshing: !isFirst, error: null};
        this.publish(entry);

        this.runSeed(entry, runId)
            .catch((err) => {
                console.error('[alarm-stats] seed failed', err);
                if (entry.runId === runId) {
                    entry.snapshot = {
                        ...entry.snapshot,
                        loading: false,
                        refreshing: false,
                        error: String(err?.message ?? err),
                    };
                    this.publish(entry);
                }
            })
            .finally(() => {
                if (entry.runId === runId) entry.seeding = false;
            });
    }

    private async runSeed(entry: Entry, runId: number) {
        if (entry.params.seedMode === 'counts') return this.runCountSeed(entry, runId);
        const cancelled = () => entry.runId !== runId;
        const laneMap = this.laneMap;

        const windowEndMs = Date.now();
        const windowStartMs = windowEndMs - (WINDOW_SPAN_MS[entry.params.window] ?? WINDOW_SPAN_MS['24h']);
        const startIso = new Date(windowStartMs).toISOString();
        const endIso = new Date(windowEndMs).toISOString();

        const acc = emptyAcc();

        // One occupancy datastream per selected lane. Iterating lane-by-lane
        // means we never need to map a datastream id back to a lane.
        const targets: { laneId: string; ds: any }[] = [];
        for (const laneId of entry.params.lanes) {
            const laneEntry = laneMap.get(laneId);
            if (!laneEntry) continue;
            for (const ds of laneEntry.datastreams ?? []) {
                if (isOccupancyDataStream(ds)) targets.push({laneId, ds});
            }
        }

        if (targets.length === 0) {
            if (cancelled()) return;
            this.commit(entry, acc, windowStartMs, windowEndMs);
            return;
        }

        // The per-datastream route is used deliberately: the node-level
        // /observations?dataStream=<csv> route (what EventTable uses) measured
        // 7.9s for limit=2 on a 24h window against 0.27s for limit=1000 here.
        const cursors: {
            laneId: string;
            page: any;
            /** Oldest observation this cursor actually contributed. */
            oldestMs: number | null;
            /** True if the cursor still had pages left when the budget ran out. */
            truncated: boolean;
        }[] = [];
        for (let i = 0; i < targets.length; i += POOL) {
            if (cancelled()) return;
            const opened = await Promise.all(targets.slice(i, i + POOL).map(async ({laneId, ds}) => {
                try {
                    const page = await ds.searchObservations(
                        new ObservationFilter({resultTime: `${startIso}/${endIso}`, order: 'desc'}),
                        PAGE_SIZE,
                    );
                    return {laneId, page, oldestMs: null as number | null, truncated: false};
                } catch (err) {
                    console.warn(`[alarm-stats] failed to open observations for lane ${laneId}`, err);
                    return null;
                }
            }));
            for (const c of opened) if (c) cursors.push(c);
        }

        // Spend the observation budget round-robin, one page per datastream per
        // round, so a single chatty lane can't consume the whole cap before the
        // others get a look in.
        let active = cursors.filter((c) => c.page.hasNext());
        while (active.length > 0 && acc.fetchedCount < OBS_CAP) {
            if (cancelled()) return;
            const round = active.slice();
            for (let i = 0; i < round.length && acc.fetchedCount < OBS_CAP; i += POOL) {
                if (cancelled()) return;
                const pages = await Promise.all(round.slice(i, i + POOL).map(async (c) => {
                    try {
                        return {cursor: c, items: await c.page.nextPage()};
                    } catch (err) {
                        console.warn(`[alarm-stats] page fetch failed for lane ${c.laneId}`, err);
                        return {cursor: c, items: []};
                    }
                }));
                for (const {cursor, items} of pages) {
                    for (const obs of items ?? []) {
                        if (acc.fetchedCount >= OBS_CAP) {
                            acc.capped = true;
                            break;
                        }
                        const tMs = this.foldObservation(entry, acc, cursor.laneId, obs);
                        if (tMs != null && (cursor.oldestMs == null || tMs < cursor.oldestMs)) {
                            cursor.oldestMs = tMs;
                        }
                    }
                }
            }
            active = active.filter((c) => c.page.hasNext());
        }
        for (const c of cursors) c.truncated = c.page.hasNext();
        if (acc.fetchedCount >= OBS_CAP && active.length > 0) acc.capped = true;

        // Where does complete coverage begin?
        //
        // order:'desc' means each datastream kept its NEWEST observations, but
        // the budget is shared, so lanes truncate at different depths — a quiet
        // lane may reach the start of the window while a busy one only goes
        // back two days. Any bucket older than the *newest* of those truncation
        // points is missing whole lanes, so counting it would understate that
        // period. Take the max over truncated cursors only: a cursor that ran
        // out of data naturally covers the full window and constrains nothing.
        const truncatedFloors = cursors
            .filter((c) => c.truncated && c.oldestMs != null)
            .map((c) => c.oldestMs as number);
        const effectiveStartMs = truncatedFloors.length > 0
            ? Math.max(windowStartMs, ...truncatedFloors)
            : windowStartMs;
        // Only claim truncation if it actually cost us part of the window.
        acc.capped = acc.capped && effectiveStartMs > windowStartMs;

        if (entry.params.needAdjudication && acc.occIndex.size > 0) {
            if (cancelled()) return;
            // Statuses are fetched over [windowStart, now] even though we bucket
            // by occupancy time: an occupancy near the end of the window may be
            // adjudicated after windowEnd, and excluding those would
            // systematically understate the most recent buckets. Deliberate
            // divergence from the server's report-time bucketing in
            // StatisticsOutput.computeAdjudicationMetrics.
            const adjMap = await fetchAdjudicationWindow(
                laneMap, entry.params.lanes, startIso, new Date().toISOString(), cancelled,
            );
            if (cancelled()) return;
            this.foldAdjudications(acc, adjMap);
        }

        if (cancelled()) return;
        this.commit(entry, acc, effectiveStartMs, windowEndMs);
    }

    /**
     * Count-based seed: one /observations/count pair (all occupancies, then
     * alarms-only) per interval per node, folded straight into buckets.
     *
     * A successful count of 0 is real data — the interval was covered and had
     * no traffic — so its bucket IS created. A failed interval creates no
     * bucket, so the profile's normalization (which divides by covered
     * occurrences) never counts hours it has no answer for.
     *
     * Cost: intervals × 2 × nodes requests at ~0.02s each. Worst realistic
     * case (hour-of-day over 30d) is ~1,440 requests, a few seconds at this
     * pool width. POOL stays at 4 so at most 4 of the browser's ~6 sockets
     * per origin are held — the initial dashboard seed saturating all 6 is
     * exactly what starved route-chunk fetches in the cypress suite.
     */
    private async runCountSeed(entry: Entry, runId: number) {
        const cancelled = () => entry.runId !== runId;
        const laneMap = this.laneMap;

        const windowEndMs = Date.now();
        let windowStartMs = windowEndMs - (WINDOW_SPAN_MS[entry.params.window] ?? WINDOW_SPAN_MS['24h']);

        const acc = emptyAcc();

        // Counts are per-node (the endpoint takes a csv of that node's
        // datastreams), so group the selection's occupancy streams by node.
        // Keep the datastream objects too — the retention probe below needs
        // their searchObservations method.
        const byNode = new Map<string, { node: any; dsIds: string[] }>();
        const allDs: any[] = [];
        for (const laneId of entry.params.lanes) {
            const laneEntry = laneMap.get(laneId);
            if (!laneEntry?.parentNode) continue;
            const occDs = (laneEntry.datastreams ?? []).filter((ds: any) => isOccupancyDataStream(ds));
            if (occDs.length === 0) continue;
            allDs.push(...occDs);
            const group = byNode.get(laneEntry.parentNode.id) ?? {node: laneEntry.parentNode, dsIds: []};
            group.dsIds.push(...occDs.map((ds: any) => ds.properties.id));
            byNode.set(laneEntry.parentNode.id, group);
        }

        if (byNode.size === 0) {
            if (cancelled()) return;
            this.commit(entry, acc, windowStartMs, windowEndMs);
            return;
        }

        // Retention clamp. The node purges observations on a rolling horizon
        // (30 days here), so the oldest edge of a long window can lie beyond
        // what the store still has. A count of 0 for a purged day is
        // indistinguishable from a genuinely quiet day and would silently drag
        // that weekday's average down — measured on this node: three purged
        // edge days read Fri/Sat ~25% low. So find the earliest observation
        // still stored in the window (limit=1 per datastream; the API's
        // default order is oldest-first) and start coverage there. Days with
        // real zero traffic INSIDE retention remain honest zeros.
        const earliest: number[] = [];
        const probeStartIso = new Date(windowStartMs).toISOString();
        const probeEndIso = new Date(windowEndMs).toISOString();
        for (let i = 0; i < allDs.length; i += POOL) {
            if (cancelled()) return;
            const probes = await Promise.all(allDs.slice(i, i + POOL).map(async (ds: any) => {
                try {
                    const page = await ds.searchObservations(
                        new ObservationFilter({resultTime: `${probeStartIso}/${probeEndIso}`}), 1);
                    const items = page.hasNext() ? await page.nextPage() : [];
                    const p = items?.[0]?.properties ?? items?.[0];
                    const tMs = p ? Date.parse(p.phenomenonTime ?? p.resultTime) : NaN;
                    return Number.isFinite(tMs) ? tMs : null;
                } catch (err) {
                    console.warn('[alarm-stats] earliest-observation probe failed', err);
                    return null;
                }
            }));
            for (const t of probes) if (t != null) earliest.push(t);
        }
        if (earliest.length === 0) {
            // Nothing stored in the window at all.
            if (cancelled()) return;
            this.commit(entry, acc, windowStartMs, windowEndMs);
            return;
        }
        const earliestMs = Math.min(...earliest);
        if (earliestMs > windowStartMs) {
            console.info(`[alarm-stats] profile window clamped to stored history: ${new Date(earliestMs).toISOString()}`);
            windowStartMs = earliestMs;
        }

        const intervals = buildProfileIntervals(entry.bucketMs, windowStartMs, windowEndMs);
        let ok = 0;

        for (let i = 0; i < intervals.length; i += POOL) {
            if (cancelled()) return;
            await Promise.all(intervals.slice(i, i + POOL).map(async (iv) => {
                const startIso = new Date(iv.startMs).toISOString();
                const endIso = new Date(iv.endMs).toISOString();
                try {
                    let occupancies = 0;
                    let alarms = 0;
                    for (const {node, dsIds} of byNode.values()) {
                        // Sequential pair: a parallel pair would double the
                        // sockets this seed holds. Any node failing fails the
                        // whole interval — partial coverage would skew the bin.
                        occupancies += await fetchObservationCount(node, dsIds, startIso, endIso);
                        alarms += await fetchObservationCount(
                            node, dsIds, startIso, endIso, 'gammaAlarm=true OR neutronAlarm=true');
                    }
                    const bucket = blankBucket(iv.startMs);
                    bucket.occupancies = occupancies;
                    bucket.alarms = alarms;
                    acc.buckets.set(iv.startMs, bucket);
                    acc.fetchedCount += occupancies;
                    ok++;
                } catch (err) {
                    console.warn(`[alarm-stats] count seed failed for ${startIso}/${endIso}`, err);
                }
            }));
        }

        if (cancelled()) return;
        if (ok === 0 && intervals.length > 0) {
            throw new Error('all observation count queries failed');
        }
        this.commit(entry, acc, windowStartMs, windowEndMs);
    }

    /** Folds one observation into the accumulator; returns its event time, or null if unusable. */
    private foldObservation(entry: Entry, acc: Accumulator, laneId: string, obs: any): number | null {
        // The per-datastream route returns flat objects; the node-level route
        // wraps them in a consysapi Observation with everything under .properties.
        const p = obs?.properties ?? obs;
        const r = p?.result;
        if (!r) return null;

        // phenomenonTime is the server-canonical event time and is what
        // StatisticsOutput uses for latency. It is NOT uniformly startTime:
        // fixed RPM lanes report endTime, mobile D5/RS350 lanes report startTime.
        const tMs = Date.parse(p.phenomenonTime ?? r.endTime ?? r.startTime);
        if (!Number.isFinite(tMs)) return null;

        const dedupeKey = `${laneId}|${r.occupancyCount}|${r.startTime}|${r.endTime}`;
        if (acc.seen.has(dedupeKey)) return tMs;
        acc.seen.add(dedupeKey);

        acc.fetchedCount++;

        const bucketKey = Math.floor(tMs / entry.bucketMs) * entry.bucketMs;
        let bucket = acc.buckets.get(bucketKey);
        if (!bucket) {
            bucket = blankBucket(bucketKey);
            acc.buckets.set(bucketKey, bucket);
        }
        const lane = laneCounts(bucket, laneId);

        const gamma = !!r.gammaAlarm;
        const neutron = !!r.neutronAlarm;

        bucket.occupancies++;
        lane.occupancies++;
        if (gamma) bucket.gammaAlarms++;
        if (neutron) bucket.neutronAlarms++;
        if (gamma || neutron) {
            bucket.alarms++;
            lane.alarms++;
        }

        if (entry.params.needAdjudication) {
            const obsId = obs?.id ?? p?.id;
            if (obsId) acc.occIndex.set(String(obsId), {tMs, laneId, bucketKey});
        }
        return tMs;
    }

    private foldAdjudications(acc: Accumulator, adjMap: Map<string, any>) {
        for (const [obsId, adj] of adjMap) {
            const occ = acc.occIndex.get(obsId);
            if (!occ) continue;
            const bucket = acc.buckets.get(occ.bucketKey);
            if (!bucket) continue;
            const lane = laneCounts(bucket, occ.laneId);

            bucket.adjudicated++;
            lane.adjudicated++;

            // Same formula as StatisticsOutput.computeAdjudicationMetrics:
            // status report time minus occupancy phenomenon time, negatives dropped.
            const seconds = (Date.parse(adj.time) - occ.tMs) / 1000;
            if (!Number.isFinite(seconds) || seconds < 0) continue;

            bucket.adjSamples.push(seconds);
            bucket.adjSecondsSum += seconds;
            bucket.adjSecondsCount++;
            lane.adjSecondsSum += seconds;
            lane.adjSecondsCount++;
        }
    }

    private commit(entry: Entry, acc: Accumulator, windowStartMs: number, windowEndMs: number) {
        entry.acc = acc;
        entry.windowStartMs = windowStartMs;
        entry.windowEndMs = windowEndMs;
        // Remember the truncation point so the 5s tick can't slide the window
        // back past it and re-create the empty buckets we just excluded.
        entry.dataFloorMs = acc.capped ? windowStartMs : null;
        // Counts-mode buckets ('1d') are local-midnight aligned; the UTC-floor
        // pre-fill/prune math would interleave misaligned keys with them. The
        // whole series is replaced per re-seed instead, and there is no live
        // stream to bind.
        if (entry.params.seedMode !== 'counts') {
            this.seedBucketRange(entry);
            this.pruneBuckets(entry);
            this.bindLive(entry);
        }
        entry.snapshot = this.buildSnapshot(entry);
        this.publish(entry);
    }

    // ------------------------------------------------------------ live append

    private bindLive(entry: Entry) {
        if (entry.params.seedMode === 'counts') return;
        if (!entry.params.liveAppend || entry.liveBound) return;
        const laneMap = this.laneMap;
        if (!laneMap || laneMap.size === 0) return;

        // The registry owns the subscription rather than each widget, so dedupe
        // stays correct no matter how many widgets share this series.
        LaneStreamRegistry.acquire(
            `alarm-stats-${entry.key}`,
            laneMap,
            entry.params.lanes,
            OCC_STREAM,
            (laneId, _stream, message) => this.onLive(entry, laneId, message),
        );
        entry.liveBound = true;
    }

    private onLive(entry: Entry, laneId: string, message: any) {
        const floor = Math.floor(entry.windowStartMs / entry.bucketMs) * entry.bucketMs;

        for (const v of message?.values ?? []) {
            const d = v?.data;
            if (!d) continue;

            // Live records are SWE JSON; JsonDataParser injects data.timestamp
            // from the record's FIRST Time field, which for occupancy is
            // samplingTime (receipt time), not the phenomenon time. Prefer the
            // explicit endTime so live and historical rows agree.
            const tMs = Date.parse(d.endTime ?? d.startTime) || v.timestamp || d.timestamp || Date.now();
            if (!Number.isFinite(tMs)) continue;

            const dedupeKey = `${laneId}|${d.occupancyCount}|${d.startTime}|${d.endTime}`;
            if (entry.acc.seen.has(dedupeKey)) continue;
            entry.acc.seen.add(dedupeKey);

            const bucketKey = Math.floor(tMs / entry.bucketMs) * entry.bucketMs;
            if (bucketKey < floor) continue; // already off the left edge

            let bucket = entry.acc.buckets.get(bucketKey);
            if (!bucket) {
                bucket = blankBucket(bucketKey);
                entry.acc.buckets.set(bucketKey, bucket);
            }
            const lane = laneCounts(bucket, laneId);

            entry.acc.fetchedCount++;
            bucket.occupancies++;
            lane.occupancies++;
            if (d.gammaAlarm) bucket.gammaAlarms++;
            if (d.neutronAlarm) bucket.neutronAlarms++;
            if (d.gammaAlarm || d.neutronAlarm) {
                bucket.alarms++;
                lane.alarms++;
            }
            // Live rows carry no observation id and cannot already be
            // adjudicated, so they only join the adjudication counts at the
            // next re-seed. Publication happens on the tick, not here.
        }
    }

    // --------------------------------------------------------- window sliding

    private advanceWindow(entry: Entry) {
        entry.windowEndMs = Date.now();
        const span = WINDOW_SPAN_MS[entry.params.window] ?? WINDOW_SPAN_MS['24h'];
        const rawStart = entry.windowEndMs - span;
        // Never slide back past the truncation point of a capped seed.
        entry.windowStartMs = entry.dataFloorMs != null
            ? Math.max(rawStart, entry.dataFloorMs)
            : rawStart;
        this.seedBucketRange(entry);
        this.pruneBuckets(entry);
        const next = this.buildSnapshot(entry);
        // Don't clobber in-flight seed state with the tick's own view of it.
        entry.snapshot = {
            ...next,
            loading: entry.snapshot.loading,
            refreshing: entry.snapshot.refreshing,
            error: entry.snapshot.error,
        };
        this.publish(entry);
    }

    /**
     * Drop buckets that fell out of the rolling window. Because per-lane counts
     * live inside the bucket, this removes their contribution from the lane rows
     * and the totals for free — there is no second aggregate that can drift.
     */
    private pruneBuckets(entry: Entry) {
        const floor = Math.floor(entry.windowStartMs / entry.bucketMs) * entry.bucketMs;
        for (const [t, bucket] of entry.acc.buckets) {
            if (t >= floor) continue;
            entry.acc.buckets.delete(t);
            entry.acc.fetchedCount = Math.max(0, entry.acc.fetchedCount - bucket.occupancies);
        }
        // Keep the dedupe set from growing without bound on a long-lived dashboard.
        if (entry.acc.seen.size > OBS_CAP * 2) entry.acc.seen.clear();
    }

    // ------------------------------------------------------------- publishing

    private buildSnapshot(entry: Entry): AlarmStatsSnapshot {
        const buckets = [...entry.acc.buckets.values()].sort((a, b) => a.t - b.t);

        const laneAgg = new Map<string, AlarmStatsLaneRow>();
        const adjSamples: number[] = [];
        let occupancies = 0;
        let alarms = 0;
        let adjudicated = 0;
        let adjSum = 0;
        let adjCount = 0;

        // Per-lane-per-bucket series for the stacked view. Allocated lazily per
        // lane (only lanes that actually appear) and index-aligned with buckets.
        const seriesAgg = new Map<string, AlarmStatsLaneSeries>();
        const laneSeriesFor = (laneId: string): AlarmStatsLaneSeries => {
            let s = seriesAgg.get(laneId);
            if (!s) {
                s = {
                    laneId,
                    occupancies: new Array(buckets.length).fill(0),
                    alarms: new Array(buckets.length).fill(0),
                };
                seriesAgg.set(laneId, s);
            }
            return s;
        };

        for (let i = 0; i < buckets.length; i++) {
            const b = buckets[i];
            occupancies += b.occupancies;
            alarms += b.alarms;
            adjudicated += b.adjudicated;
            adjSum += b.adjSecondsSum;
            adjCount += b.adjSecondsCount;
            if (b.adjSamples.length) adjSamples.push(...b.adjSamples);

            for (const [laneId, c] of b.perLane) {
                let row = laneAgg.get(laneId);
                if (!row) {
                    row = {laneId, occupancies: 0, alarms: 0, adjudicated: 0, adjSecondsSum: 0, adjSecondsCount: 0};
                    laneAgg.set(laneId, row);
                }
                row.occupancies += c.occupancies;
                row.alarms += c.alarms;
                row.adjudicated += c.adjudicated;
                row.adjSecondsSum += c.adjSecondsSum;
                row.adjSecondsCount += c.adjSecondsCount;

                const s = laneSeriesFor(laneId);
                s.occupancies[i] = c.occupancies;
                s.alarms[i] = c.alarms;
            }
        }

        const totals: AlarmStatsTotals = {
            occupancies,
            alarms,
            adjudicated,
            alarmRate: occupancies > 0 ? alarms / occupancies : null,
            // Adjudicated is a share of OCCUPANCIES, matching LaneStatsTable and
            // the server's numAdjudicated. Sites bulk-adjudicate non-alarm
            // occupancies too, so dividing by alarms can exceed 100%.
            adjudicatedRate: occupancies > 0 ? adjudicated / occupancies : null,
            meanAdjSeconds: adjCount > 0 ? adjSum / adjCount : null,
        };

        return {
            // Strip the accumulator-only fields so consumers can't accidentally
            // hold a reference to the live per-lane maps.
            buckets: buckets.map(({perLane, adjSamples: _s, ...row}) => row),
            byLane: [...laneAgg.values()],
            laneSeries: [...seriesAgg.values()],
            totals,
            adjSamplesSec: adjSamples,
            windowStartMs: entry.windowStartMs,
            windowEndMs: entry.windowEndMs,
            bucketMs: entry.bucketMs,
            loading: false,
            refreshing: false,
            capped: entry.acc.capped,
            fetchedCount: entry.acc.fetchedCount,
            error: null,
        };
    }

    private publish(entry: Entry) {
        for (const listener of entry.listeners.values()) {
            try {
                listener(entry.snapshot);
            } catch (e) {
                console.error('[alarm-stats] listener error', e);
            }
        }
    }
}

export const AlarmStatsRegistry = new AlarmStatsRegistryImpl();
