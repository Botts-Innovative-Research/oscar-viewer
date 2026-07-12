/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {REHYDRATE} from "redux-persist";
import {RootState} from "@/lib/state/Store";
import {
    LANE_STATUS_SCHEMA_VERSION,
    LaneStatusEntry,
    LaneStatusState,
    makeLaneStatusEntry,
    rehydrateLaneStatusState,
} from "@/lib/state/LaneStatusValidation";

export type LaneStatusSource = 'connection' | 'gamma' | 'neutron' | 'tamper';

const initialState: LaneStatusState = {
    schemaVersion: LANE_STATUS_SCHEMA_VERSION,
    lanes: {},
};

/** Fetch-or-create the entry for a lane so updates never miss. */
function ensureEntry(state: LaneStatusState, laneName: string): LaneStatusEntry {
    let entry = state.lanes[laneName];
    if (!entry) {
        entry = makeLaneStatusEntry();
        state.lanes[laneName] = entry;
    }
    return entry;
}

export const Slice = createSlice({
    name: 'laneStatusSlice',
    initialState,
    reducers: {
        /**
         * Merge-insert default entries for the currently known lanes and refresh
         * their parentNode. Never overwrites live flags, and never prunes:
         * callers may pass a widget-scoped lane subset (or an empty list before
         * lane discovery finishes), so deleting absent names here would wipe
         * persisted status for lanes owned by other widgets or not yet
         * discovered. Rendering is driven by laneIds, so orphan entries for
         * genuinely removed lanes are invisible and harmless.
         */
        ensureLanes: (state, action: PayloadAction<{ lanes: { name: string; parentNode: string }[] }>) => {
            for (const {name, parentNode} of action.payload.lanes) {
                if (!name) continue;
                const entry = ensureEntry(state, name);
                if (parentNode) entry.parentNode = parentNode;
            }
        },

        /** Apply one realtime stream message to a lane's latched status. */
        applyStatusUpdate: (state, action: PayloadAction<{
            laneName: string;
            source: LaneStatusSource;
            newState: string;
        }>) => {
            const {laneName, source, newState} = action.payload;
            const entry = ensureEntry(state, laneName);

            switch (source) {
                case 'connection':
                    if (newState === 'Online') {
                        entry.isOnline = true;
                    } else if (newState === 'Offline') {
                        entry.isOnline = false;
                        entry.isTamper = false;
                        entry.gammaFault = false;
                        entry.neutronFault = false;
                        entry.isGammaAlarm = false;
                        entry.isNeutronAlarm = false;
                        entry.isScanning = false;
                    }
                    break;
                case 'gamma':
                    entry.isOnline = true;
                    if (newState.includes('Fault')) {
                        entry.gammaFault = true;
                    } else if (newState === 'Alarm') {
                        entry.isGammaAlarm = true;
                        entry.gammaFault = false;
                    } else if (newState === 'Scan') {
                        entry.isScanning = true;
                        entry.gammaFault = false;
                    } else if (newState === 'Background') {
                        entry.isScanning = false;
                        entry.gammaFault = false;
                    }
                    break;
                case 'neutron':
                    entry.isOnline = true;
                    if (newState.includes('Fault')) {
                        entry.neutronFault = true;
                    } else if (newState === 'Alarm') {
                        entry.isNeutronAlarm = true;
                        entry.neutronFault = false;
                    } else if (newState === 'Scan') {
                        entry.isScanning = true;
                        entry.neutronFault = false;
                    } else if (newState === 'Background') {
                        entry.isScanning = false;
                        entry.neutronFault = false;
                    }
                    break;
                case 'tamper':
                    entry.isOnline = true;
                    if (newState === 'Tamper') entry.isTamper = true;
                    else if (newState === 'TamperOff') entry.isTamper = false;
                    break;
            }
        },

        /** User acknowledged/silenced the active alarms for a lane. */
        silenceAlarms: (state, action: PayloadAction<{ laneName: string }>) => {
            const entry = state.lanes[action.payload.laneName];
            if (!entry) return;
            entry.isGammaAlarm = false;
            entry.isNeutronAlarm = false;
        },

        /**
         * Reconcile the deterministic (device-driven) fields for a lane from its
         * latest server observation on load. The momentary alarm latch
         * (isGammaAlarm/isNeutronAlarm) is intentionally NOT touched — it stays
         * until the operator silences it.
         */
        reconcileLane: (state, action: PayloadAction<{
            laneName: string;
            gammaAlarmState?: string;
            neutronAlarmState?: string;
            tamperStatus?: boolean;
            isConnected?: boolean;
        }>) => {
            const {laneName, gammaAlarmState, neutronAlarmState, tamperStatus, isConnected} = action.payload;
            const entry = ensureEntry(state, laneName);

            if (gammaAlarmState !== undefined) {
                entry.gammaFault = gammaAlarmState.includes('Fault');
            }
            if (neutronAlarmState !== undefined) {
                entry.neutronFault = neutronAlarmState.includes('Fault');
            }
            if (gammaAlarmState !== undefined || neutronAlarmState !== undefined) {
                entry.isScanning = gammaAlarmState === 'Scan' || neutronAlarmState === 'Scan';
            }
            if (tamperStatus !== undefined) {
                entry.isTamper = tamperStatus === true;
            }
            if (isConnected !== undefined) {
                entry.isOnline = isConnected === true;
            }
        },
    },
    extraReducers: (builder) => {
        builder.addMatcher(
            (action): action is PayloadAction<any> => action.type === REHYDRATE,
            (state, action: any) => {
                const inbound = action.payload?.laneStatusSlice;
                if (inbound === undefined) return state;
                // Return a NEW object so redux-persist's autoMergeLevel1 keeps
                // our sanitized/migrated state instead of the raw persisted value.
                return rehydrateLaneStatusState(inbound);
            }
        );
    },
});

export const {
    ensureLanes,
    applyStatusUpdate,
    silenceAlarms,
    reconcileLane,
} = Slice.actions;

export const selectLaneStatusMap = (state: RootState) => state.laneStatusSlice.lanes;

export default Slice.reducer;
