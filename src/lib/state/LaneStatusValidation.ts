/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

/**
 * Types + sanitizer for the persisted lane status slice (laneStatusSlice).
 *
 * Mirrors the pageLayoutSlice pattern: a schema version travels with the
 * persisted state and rehydrateLaneStatusState() runs on REHYDRATE to migrate
 * old shapes and drop/coerce malformed entries rather than crashing the app on
 * a bad localStorage payload.
 */

export const LANE_STATUS_SCHEMA_VERSION = 1;

export interface LaneStatusEntry {
    parentNode: string;
    isOnline: boolean;
    isTamper: boolean;
    /** Per-source fault (gamma stream). Displayed isFault = gammaFault || neutronFault. */
    gammaFault: boolean;
    /** Per-source fault (neutron stream). */
    neutronFault: boolean;
    /** Momentary alarm latch — client-only, cleared by user silence or Offline. */
    isGammaAlarm: boolean;
    isNeutronAlarm: boolean;
    isScanning: boolean;
}

export interface LaneStatusState {
    schemaVersion: number;
    lanes: Record<string, LaneStatusEntry>;
}

export function makeLaneStatusEntry(parentNode = ''): LaneStatusEntry {
    return {
        parentNode,
        isOnline: false,
        isTamper: false,
        gammaFault: false,
        neutronFault: false,
        isGammaAlarm: false,
        isNeutronAlarm: false,
        isScanning: false,
    };
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function coerceBool(v: unknown): boolean {
    return v === true;
}

/** Coerce an arbitrary persisted value into a valid LaneStatusEntry. */
function coerceEntry(raw: unknown): LaneStatusEntry {
    if (!isObject(raw)) return makeLaneStatusEntry();
    return {
        parentNode: typeof raw.parentNode === 'string' ? raw.parentNode : '',
        isOnline: coerceBool(raw.isOnline),
        isTamper: coerceBool(raw.isTamper),
        // Back-compat: an older shape may have persisted a single `isFault`.
        gammaFault: coerceBool(raw.gammaFault) || coerceBool((raw as any).isFault),
        neutronFault: coerceBool(raw.neutronFault),
        isGammaAlarm: coerceBool(raw.isGammaAlarm),
        isNeutronAlarm: coerceBool(raw.isNeutronAlarm),
        isScanning: coerceBool(raw.isScanning),
    };
}

/**
 * Upgrade persisted lanes from an older schemaVersion to the current one.
 * No-op today (v1 is the first shape); kept so future shape changes self-heal
 * the same way migratePages does for the layout slice.
 */
function migrateLaneStatus(
    lanes: Record<string, LaneStatusEntry>,
    _fromVersion: number,
): Record<string, LaneStatusEntry> {
    return lanes;
}

/**
 * Sanitize + migrate the persisted slice on rehydrate. Returns a NEW object so
 * redux-persist's autoMergeLevel1 keeps this reducer-produced value instead of
 * overwriting it with the raw persisted payload.
 */
export function rehydrateLaneStatusState(inbound: unknown): LaneStatusState {
    const fallback: LaneStatusState = {
        schemaVersion: LANE_STATUS_SCHEMA_VERSION,
        lanes: {},
    };
    if (!isObject(inbound) || !isObject(inbound.lanes)) {
        if (inbound !== undefined) {
            console.warn('[laneStatus] discarded malformed persisted state');
        }
        return fallback;
    }

    const cleaned: Record<string, LaneStatusEntry> = {};
    for (const [name, raw] of Object.entries(inbound.lanes)) {
        if (!name) continue;
        cleaned[name] = coerceEntry(raw);
    }

    const fromVersion = typeof inbound.schemaVersion === 'number' ? inbound.schemaVersion : 0;
    return {
        schemaVersion: LANE_STATUS_SCHEMA_VERSION,
        lanes: migrateLaneStatus(cleaned, fromVersion),
    };
}
