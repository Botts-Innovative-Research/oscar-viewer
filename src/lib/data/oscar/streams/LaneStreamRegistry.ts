/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {LaneDSColl, LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {
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
export type LaneStreamName = 'connectionRT' | 'gammaRT' | 'neutronRT' | 'tamperRT' | 'gammaTrshldRT' | 'occRT' | 'locRT' | 'rs350AlarmRT' | 'radStatusRT';

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

const ALL_STREAM_NAMES: LaneStreamName[] = ['connectionRT', 'gammaRT', 'neutronRT', 'tamperRT', 'gammaTrshldRT', 'occRT', 'locRT', 'rs350AlarmRT', 'radStatusRT'];

class LaneStreamRegistryImpl {
    private lanes = new Map<string, LaneEntry>();

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
        return coll;
    }

    private ensureLane(laneId: string, mapEntry: LaneMapEntry): LaneEntry {
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
}

export const LaneStreamRegistry = new LaneStreamRegistryImpl();

export function resolveLaneSelection(selection: LaneSelection, laneMap: Map<string, LaneMapEntry>): string[] {
    if (!laneMap) return [];
    if (selection.mode === 'all') return [...laneMap.keys()];
    return selection.lanes.filter((l) => laneMap.has(l));
}

export {ALL_STREAM_NAMES};
