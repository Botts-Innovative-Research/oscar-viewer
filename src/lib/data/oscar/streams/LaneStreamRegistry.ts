/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
    isAdjudicationControlStream,
    isConnectionDataStream,
    isD5RadiometricStatusDataStream,
    isGammaDataStream,
    isLocationDataStream,
    isNeutronDataStream,
    isOccupancyDataStream,
    isRs350AlarmDataStream,
    isTamperDataStream,
    isThresholdDataStream,
} from "@/lib/data/oscar/Utilities";
import {LaneSelection} from "@/lib/layout/PageConfigTypes";

// NOTE: stream names double as LaneDSColl property names (see buildColl/addDS),
// so a new name here must have a matching array slot in LaneDSColl.
export type LaneStreamName = 'connectionRT' | 'gammaRT' | 'neutronRT' | 'tamperRT' | 'gammaTrshldRT' | 'occRT' | 'locRT' | 'rs350AlarmRT' | 'radStatusRT' | 'adjStatusRT';

export type LaneStreamHandler = (laneId: string, stream: LaneStreamName, message: any) => void;

/**
 * Shared, ref-counted access to the per-lane realtime datasources held in
 * laneMapRef. osh-js datasources have subscribe() but no unsubscribe, and the
 * ConSysApi instances in LaneMapEntry are shared app-wide — if every widget
 * subscribed and connected them directly (as the old dashboard page did),
 * multiple widgets would stack duplicate handlers and disconnect streams out
 * from under each other. This registry attaches exactly one dispatcher per
 * lane stream and fans messages out to registered handlers; streams connect
 * when the first handler arrives and stay connected for the app session.
 *
 * Streams are deliberately NEVER disconnected when the last handler leaves:
 * in osh-js, disconnect is a one-way door. The shared MqttProvider keeps an
 * unsubscribed topic in its dedupe list so a resubscribe is silently skipped,
 * and MqttTopicConnector nulls its BroadcastChannel on disconnect and never
 * recreates it — either one permanently kills the stream until a full page
 * reload (this is what froze the dashboard Lane Status after navigating away
 * and back). An empty handler map already gates delivery, so idle streams
 * only cost the broker push itself.
 */
interface StreamChannel {
    handlers: Map<string, LaneStreamHandler>; // bundleId -> handler
    dispatcherAttached: boolean;
    connected: boolean;
}

interface LaneEntry {
    /** The LaneMapEntry the collection was built from; identity change = rebuild. */
    sourceEntry: LaneMapEntry;
    coll: LaneDSColl;
    channels: Map<LaneStreamName, StreamChannel>;
}

const ALL_STREAM_NAMES: LaneStreamName[] = ['connectionRT', 'gammaRT', 'neutronRT', 'tamperRT', 'gammaTrshldRT', 'occRT', 'locRT', 'rs350AlarmRT', 'radStatusRT', 'adjStatusRT'];

/**
 * A lane with no message on ANY of its streams for this long has lost comms.
 * A stopped/crashed module never publishes a final isConnected:false — silence
 * is the only signal. Every live device carries at least one 1 Hz stream
 * (connectionStatus on RPMs and the RS-350, radiometric status on the D5,
 * sensor location on mobiles), so this is ~15 missed heartbeats.
 */
export const LANE_COMMS_STALE_MS = 15_000;

/** Cadence for consumers' staleness sweeps (see useStalenessSweep). */
export const LANE_COMMS_SWEEP_MS = 5_000;

class LaneStreamRegistryImpl {
    private lanes = new Map<string, LaneEntry>();
    /** Wall-clock arrival time of the newest realtime message per lane. */
    private lastMessageAt = new Map<string, number>();
    /**
     * Per-lane staleness grace baseline: seeded at first touch so a lane is
     * never declared stale before its first message had a chance to arrive,
     * and only ever lowered afterwards (see noteObservedAt).
     */
    private baselineAt = new Map<string, number>();

    private buildColl(mapEntry: LaneMapEntry): LaneDSColl {
        const coll = new LaneDSColl();
        mapEntry.datastreams.forEach((ds: any, idx: number) => {
            const rtDS = mapEntry.datasourcesRealtime?.[idx];
            if (!rtDS) {
                console.warn(`[LaneStreamRegistry] missing RT datasource for datastream idx ${idx} of lane ${mapEntry.laneName}`);
                return;
            }
            rtDS.properties.startTime = new Date().toISOString();
            rtDS.properties.endTime = "2055-01-01T08:13:25.845Z";

            if (isGammaDataStream(ds)) coll.addDS('gammaRT', rtDS);
            if (isNeutronDataStream(ds)) coll.addDS('neutronRT', rtDS);
            if (isTamperDataStream(ds)) coll.addDS('tamperRT', rtDS);
            if (isConnectionDataStream(ds)) coll.addDS('connectionRT', rtDS);
            if (isThresholdDataStream(ds)) coll.addDS('gammaTrshldRT', rtDS);
            if (isOccupancyDataStream(ds)) coll.addDS('occRT', rtDS);
            if (isLocationDataStream(ds)) coll.addDS('locRT', rtDS);
            if (isRs350AlarmDataStream(ds)) coll.addDS('rs350AlarmRT', rtDS);
            if (isD5RadiometricStatusDataStream(ds)) coll.addDS('radStatusRT', rtDS);
        });

        // Adjudications arrive as command statuses on a CONTROL stream, so
        // there is no entry in datasourcesRealtime to reuse and the datasource
        // has to be built here. Routing it through the registry is the point:
        // useAdjudicationMap used to build, connect and then disconnect its own
        // per-lane source on effect cleanup, which is precisely the one-way
        // door described above — react-grid-layout remounts widgets on a
        // breakpoint change, so an ordinary window resize was enough to kill
        // the adjudication stream for the rest of the page's life.
        //
        // No startTime stamp here, unlike the datastreams above: ConSysApi
        // already defaults REAL_TIME sources to startTime 'now'.
        const adjControlStream = mapEntry.controlStreams?.find((cs: any) => isAdjudicationControlStream(cs));
        if (adjControlStream) {
            try {
                const adjRtDS = mapEntry.createRealTimeConSysApi(adjControlStream);
                if (adjRtDS) coll.addDS('adjStatusRT', adjRtDS);
            } catch (e) {
                console.warn(`[LaneStreamRegistry] failed to build adjudication status source for lane ${mapEntry.laneName}:`, e);
            }
        }

        return coll;
    }

    private ensureLane(laneId: string, mapEntry: LaneMapEntry): LaneEntry {
        // First touch starts the grace window. Never reset on the rebuild
        // branch below: a lane-map refetch must not un-stale a silent lane.
        if (!this.baselineAt.has(laneId)) this.baselineAt.set(laneId, Date.now());
        let entry = this.lanes.get(laneId);
        if (entry && entry.sourceEntry === mapEntry) return entry;

        if (!entry) {
            entry = {sourceEntry: mapEntry, coll: this.buildColl(mapEntry), channels: new Map()};
            this.lanes.set(laneId, entry);
            return entry;
        }

        // LaneMapEntry was rebuilt (node change / refetch): rebuild the
        // collection and re-wire channels that still have listeners.
        entry.sourceEntry = mapEntry;
        entry.coll = this.buildColl(mapEntry);
        for (const [stream, channel] of entry.channels) {
            channel.dispatcherAttached = false;
            channel.connected = false;
            if (channel.handlers.size > 0) {
                this.attachAndConnect(laneId, entry, stream, channel);
            }
        }
        return entry;
    }

    private attachAndConnect(laneId: string, entry: LaneEntry, stream: LaneStreamName, channel: StreamChannel) {
        if (!channel.dispatcherAttached) {
            entry.coll.addSubscribeHandlerToALLDSMatchingName(stream, (message: any) => {
                // Liveness stamp before the fan-out, even with an empty
                // handler map — every widget's staleness view keys off this.
                this.lastMessageAt.set(laneId, Date.now());
                for (const handler of channel.handlers.values()) {
                    try {
                        handler(laneId, stream, message);
                    } catch (e) {
                        console.error(`[LaneStreamRegistry] handler error for ${laneId}/${stream}:`, e);
                    }
                }
            });
            channel.dispatcherAttached = true;
        }
        if (!channel.connected && channel.handlers.size > 0) {
            channel.connected = true;
            entry.coll.addConnectToALLDSMatchingName(stream).catch((e: any) => {
                console.error(`[LaneStreamRegistry] connect failed for ${laneId}/${stream}:`, e);
                channel.connected = false;
            });
        }
    }

    /**
     * Register a handler bundle for the given lanes and streams. Calling again
     * with the same bundleId replaces the bundle's registrations.
     */
    acquire(
        bundleId: string,
        laneMap: Map<string, LaneMapEntry>,
        laneIds: string[],
        streams: LaneStreamName[],
        handler: LaneStreamHandler,
    ) {
        this.release(bundleId);
        for (const laneId of laneIds) {
            const mapEntry = laneMap.get(laneId);
            if (!mapEntry) continue;
            const entry = this.ensureLane(laneId, mapEntry);
            for (const stream of streams) {
                let channel = entry.channels.get(stream);
                if (!channel) {
                    channel = {handlers: new Map(), dispatcherAttached: false, connected: false};
                    entry.channels.set(stream, channel);
                }
                channel.handlers.set(bundleId, handler);
                this.attachAndConnect(laneId, entry, stream, channel);
            }
        }
    }

    /**
     * Remove a handler bundle everywhere. Streams stay connected even with no
     * handlers left — see the class comment for why disconnecting is unsafe.
     */
    release(bundleId: string) {
        for (const entry of this.lanes.values()) {
            for (const channel of entry.channels.values()) {
                channel.handlers.delete(bundleId);
            }
        }
    }

    /**
     * Direct handle on the underlying shared realtime datasources of one lane
     * stream (e.g. for chart threshold reads). Consumers must NOT connect,
     * disconnect, or subscribe these instances themselves — use acquire().
     */
    getRawDatasources(laneMap: Map<string, LaneMapEntry>, laneId: string, stream: LaneStreamName): any[] {
        const mapEntry = laneMap.get(laneId);
        if (!mapEntry) return [];
        const entry = this.ensureLane(laneId, mapEntry);
        return entry.coll.getDSArray(stream);
    }

    /**
     * Newest evidence of life for a lane: the later of the last realtime
     * message arrival and the grace baseline (first touch, lowered by REST
     * evidence). Undefined if the lane was never touched.
     */
    getLastSeen(laneId: string): number | undefined {
        const arrived = this.lastMessageAt.get(laneId);
        const baseline = this.baselineAt.get(laneId);
        if (arrived === undefined && baseline === undefined) return undefined;
        return Math.max(arrived ?? -Infinity, baseline ?? -Infinity);
    }

    /**
     * True when a touched lane has been silent on ALL its streams for longer
     * than LANE_COMMS_STALE_MS. Never-touched lanes return false — liveness is
     * unjudgeable without a subscription; consumers' own defaults cover them.
     */
    isLaneStale(laneId: string, nowMs: number = Date.now()): boolean {
        const lastSeen = this.getLastSeen(laneId);
        return lastSeen !== undefined && nowMs - lastSeen > LANE_COMMS_STALE_MS;
    }

    /**
     * Feed REST evidence ("the newest stored observation is from tMs") into
     * the grace baseline. Only ever LOWERS it: a stored observation bounds how
     * long the producer has been silent but never proves it alive now —
     * raising freshness is exclusively the live dispatcher's job. This makes
     * a system that is already down at page load show stale immediately
     * instead of waiting out the grace window.
     */
    noteObservedAt(laneId: string, tMs: number) {
        if (!Number.isFinite(tMs)) return;
        const current = this.baselineAt.get(laneId);
        if (current === undefined || tMs < current) this.baselineAt.set(laneId, tMs);
    }
}

export const LaneStreamRegistry = new LaneStreamRegistryImpl();

export function resolveLaneSelection(selection: LaneSelection, laneMap: Map<string, LaneMapEntry>): string[] {
    if (!laneMap) return [];
    if (selection.mode === 'all') return [...laneMap.keys()];
    return selection.lanes.filter((l) => laneMap.has(l));
}

export {ALL_STREAM_NAMES};
