/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {MutableRefObject, useContext, useEffect, useRef} from "react";
import DataStreams from "osh-js/source/core/consysapi/datastream/DataStreams.js";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter.js";
import {DataSourceContext} from "@/app/contexts/DataSourceContext";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {useAppDispatch} from "@/lib/state/Hooks";
import {LANE_COMMS_STALE_MS, LaneStreamName, LaneStreamRegistry} from "./LaneStreamRegistry";
import {reconcileLane} from "@/lib/state/LaneStatusSlice";

/** Lanes reconciled per batch — keeps the burst of one-shot REST reads bounded. */
const CHUNK_SIZE = 5;

/**
 * Read the latest observation of one lane stream via a one-shot REST query.
 * Reuses the shared realtime datasource ONLY to resolve endpoint/resource — it
 * never connects/subscribes it (see the LaneStreamRegistry contract). Returns
 * the observation `result` plus its time (NaN if unparsable), or null if
 * unavailable.
 */
async function fetchLatestResult(
    laneMap: Map<string, LaneMapEntry>,
    laneName: string,
    stream: LaneStreamName,
): Promise<{ result: any; timeMs: number } | null> {
    const sources = LaneStreamRegistry.getRawDatasources(laneMap, laneName, stream);
    const datasource = sources[0];
    if (!datasource) return null;

    const dataStreamId = datasource.properties.resource.split('/')[2];
    const dsAPI = new DataStreams({
        endpointUrl: `${datasource.properties.endpointUrl}`,
        tls: datasource.properties.tls,
        connectorOpts: datasource.properties.connectorOpts,
        mqttOpts: datasource.properties.mqttOpts,
        streamProtocol: 'mqtt',
    });

    const dataStream = await dsAPI.getDataStreamById(dataStreamId);
    const query = await dataStream.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);
    const page = await query.nextPage();
    const obs = page?.[0];
    if (!obs) return null;
    // Observation fields may sit on the object itself or under .properties
    // depending on the osh-js path — same normalization as AlarmStatsRegistry.
    const props = obs.properties ?? obs;
    const timeMs = Date.parse(props?.phenomenonTime ?? props?.resultTime);
    return {result: obs.result ?? props?.result ?? null, timeMs};
}

/** Reconcile a single lane's deterministic status from its latest observations. */
async function reconcileOneLane(
    laneMap: Map<string, LaneMapEntry>,
    laneName: string,
    dispatch: ReturnType<typeof useAppDispatch>,
) {
    // radStatusRT is fetched purely as a liveness probe: the Kromek D5 has no
    // connectionStatus output, so its 1 Hz radiometric status is the only
    // reconcilable evidence of life (mirrors the live handlers in LaneStatus).
    const [gamma, neutron, tamper, connection, radStatus] = await Promise.all([
        fetchLatestResult(laneMap, laneName, 'gammaRT').catch((): any => null),
        fetchLatestResult(laneMap, laneName, 'neutronRT').catch((): any => null),
        fetchLatestResult(laneMap, laneName, 'tamperRT').catch((): any => null),
        fetchLatestResult(laneMap, laneName, 'connectionRT').catch((): any => null),
        fetchLatestResult(laneMap, laneName, 'radStatusRT').catch((): any => null),
    ]);

    // Only pass fields that were actually read so the reducer leaves the rest
    // (and the client-only alarm latch) untouched.
    const payload: Parameters<typeof reconcileLane>[0] = {laneName};
    if (gamma?.result?.alarmState !== undefined) payload.gammaAlarmState = gamma.result.alarmState;
    if (neutron?.result?.alarmState !== undefined) payload.neutronAlarmState = neutron.result.alarmState;
    if (tamper?.result?.tamperStatus !== undefined) payload.tamperStatus = tamper.result.tamperStatus === true;

    // Liveness: the newest stored observation bounds how long the producer has
    // been silent. A latest-obs that is itself older than the comms threshold
    // means the producer stopped publishing — its stored isConnected:true
    // predates the silence, so it must not re-assert green.
    const newestMs = Math.max(...[gamma, neutron, tamper, connection, radStatus]
        .map((r) => (r && Number.isFinite(r.timeMs)) ? r.timeMs : -Infinity));
    if (Number.isFinite(newestMs)) {
        LaneStreamRegistry.noteObservedAt(laneName, newestMs);
        if (Date.now() - newestMs > LANE_COMMS_STALE_MS) {
            payload.isConnected = false;
        } else if (connection?.result?.isConnected !== undefined) {
            payload.isConnected = connection.result.isConnected === true;
        } else {
            // Fresh observation but no readable connection stream (e.g. D5):
            // fresh = alive, same treatment as the live radStatusRT handler.
            payload.isConnected = true;
        }
    }

    // Nothing to reconcile (no streams resolved yet) — skip so it retries later.
    if (Object.keys(payload).length <= 1) return false;

    dispatch(reconcileLane(payload));
    return true;
}

/**
 * On mount / when new lanes appear, reconcile each lane's persisted fault,
 * tamper, scanning and connection state against the device's latest observation
 * so a fault that cleared while the tab was closed does not show stale. Runs
 * once per lane per mount; live stream messages remain authoritative afterward.
 */
export function useLaneStatusReconciliation(laneIds: string[], enabled: boolean = true) {
    const {laneMapRef} = useContext(DataSourceContext);
    const dispatch = useAppDispatch();
    const reconciledRef: MutableRefObject<Set<string>> = useRef(new Set<string>());

    const laneIdsKey = laneIds.join(',');

    useEffect(() => {
        if (!enabled) return;
        const laneMap = laneMapRef.current;
        if (!laneMap) return;

        const pending = laneIds.filter((name) => !reconciledRef.current.has(name));
        if (pending.length === 0) return;

        let cancelled = false;

        (async () => {
            for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
                if (cancelled) return;
                const chunk = pending.slice(i, i + CHUNK_SIZE);
                const results = await Promise.allSettled(
                    chunk.map((name) => reconcileOneLane(laneMap, name, dispatch)),
                );
                // Mark as reconciled only when the lane actually produced a
                // reconcilable read; otherwise leave it for a later pass.
                results.forEach((res, idx) => {
                    if (res.status === 'fulfilled' && res.value) {
                        reconciledRef.current.add(chunk[idx]);
                    }
                });
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, laneIdsKey]);
}
