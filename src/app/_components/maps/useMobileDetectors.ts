"use client";

/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

import {useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import {useRouter} from "next/dist/client/components/navigation";
import L from "leaflet";
import ObservationFilter from "osh-js/source/core/consysapi/observation/ObservationFilter";
import {LaneMapEntry, isMobileLane} from "@/lib/data/oscar/LaneCollection";
import {LaneSelection, MapAlarmWindow} from "@/lib/layout/PageConfigTypes";
import {useLaneStreams} from "@/lib/data/oscar/streams/useLaneStreams";
import {useAdjudicationMap} from "@/app/_components/event-table/useAdjudicationMap";
import {isOccupancyDataStream} from "@/lib/data/oscar/Utilities";
import {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {convertToMap, hashString} from "@/app/utils/Utils";
import {useAppDispatch} from "@/lib/state/Hooks";
import {setCurrentLane} from "@/lib/state/LaneViewSlice";
import {setEventPreview, setSelectedRowId} from "@/lib/state/EventPreviewSlice";
import {setSelectedEvent} from "@/lib/state/EventDataSlice";
import {selectLaneMap} from "@/lib/state/OSCARLaneSlice";
import {RootState} from "@/lib/state/Store";

export type {MapAlarmWindow};

const MOBILE_NORMAL_COLOR = '#1565c0';
const MOBILE_ALARM_COLOR = '#d32f2f';
/** How long the walker icon stays red after a live alarm event. */
const MOBILE_ALARM_FLASH_MS = 30_000;
/** Ring buffer of recent fixes per lane, for alarm->position time joins. */
const FIX_BUFFER_MAX = 600;
/** Max |alarm time - fix time| for a ring-buffer/REST position join. */
const FIX_JOIN_MAX_DELTA_MS = 90_000;
const HISTORICAL_ALARMS_MAX = 300;

interface Fix {
    t: number;
    lat: number;
    lon: number;
}

interface AlarmMarkerEntry {
    marker: L.CircleMarker;
    eventData: EventTableData;
}

export interface MobileDetectorOptions {
    /** Master switch; also gated on the Leaflet map being initialized. */
    enabled: boolean;
    showTrail: boolean;
    trailLength: number;
    showAlarmMarkers: boolean;
    alarmTimeWindow: MapAlarmWindow;
    /** Widget lane filter (null = all lanes). */
    laneFilterSet: Set<string> | null;
    getMap: () => L.Map | null;
    /** Called once per mobile lane on its first fix so the host can fitBounds. */
    onFirstFix?: (latlng: L.LatLng) => void;
}

function windowStartMs(window: MapAlarmWindow): number {
    const now = Date.now();
    switch (window) {
        case '1h': return now - 3_600_000;
        case '8h': return now - 8 * 3_600_000;
        case '24h': return now - 24 * 3_600_000;
        case 'today':
        default: {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }
    }
}

function mobileIcon(laneName: string, alarming: boolean): L.DivIcon {
    const color = alarming ? MOBILE_ALARM_COLOR : MOBILE_NORMAL_COLOR;
    // Material "directions walk" glyph inside a ringed disc
    return L.divIcon({
        className: 'mobile-unit-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -14],
        html: `<div title="${laneName}" style="width:30px;height:30px;border-radius:50%;background:#ffffff;border:3px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">
<svg viewBox="0 0 24 24" width="20" height="20" fill="${color}"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>
</div>`,
    });
}

/** Normalize the location record shape: driver outputs name the vector
 *  "sensorLocation", the lane system's own output names it "location". */
function readFix(rec: any): { lat: number, lon: number } | null {
    const loc = rec?.sensorLocation ?? rec?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') return null;
    if (loc.lat === 0 && loc.lon === 0) return null;
    return {lat: loc.lat, lon: loc.lon};
}

/**
 * Live tracking + alarm markers for mobile radiation detectors (RS350
 * backpack / Kromek D5) on the Leaflet map. All Leaflet state is kept in
 * refs and mutated directly (never through React state) so a 1 Hz location
 * stream doesn't re-render the host component — same pattern as the static
 * lane circleMarkers in MapComponent.
 *
 * The alarm layer shows UNADJUDICATED alarms only: adjudicating an event
 * (any code with a real group) removes its marker — live via the command
 * status stream, and on load by filtering the historical fetch.
 */
export function useMobileDetectors(options: MobileDetectorOptions) {
    const {enabled, showTrail, trailLength, showAlarmMarkers, alarmTimeWindow, laneFilterSet, getMap, onFirstFix} = options;
    const laneMapRaw = useSelector((state: RootState) => selectLaneMap(state));
    // Redux may hold the lane map as a plain object after (re)hydration —
    // normalize like MapComponent/EventTable do
    const laneMap = useMemo(() => convertToMap(laneMapRaw), [laneMapRaw]);
    const dispatch = useAppDispatch();
    const router = useRouter();

    // Leaflet may initialize after the lane map is already populated; every
    // data path below must wait for the map or its markers get silently
    // dropped by the getMap() null-guards and never retried.
    const [mapReady, setMapReady] = useState(false);
    useEffect(() => {
        if (!enabled) {
            setMapReady(false);
            return;
        }
        if (getMap()) {
            setMapReady(true);
            return;
        }
        const iv = setInterval(() => {
            if (getMap()) {
                setMapReady(true);
                clearInterval(iv);
            }
        }, 300);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    const markersByLane = useRef<Map<string, L.Marker>>(new Map());
    const trailByLane = useRef<Map<string, L.Polyline>>(new Map());
    const fixBufferByLane = useRef<Map<string, Fix[]>>(new Map());
    const alarmFlashTimer = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const alarmMarkers = useRef<Map<number, AlarmMarkerEntry>>(new Map());
    const adjudicatedKeys = useRef<Set<number>>(new Set());
    const seededInitialPos = useRef<Set<string>>(new Set());
    const historicalKey = useRef<string>('');

    const mobileLaneNames = useMemo(() => {
        const names: string[] = [];
        laneMap?.forEach((entry: LaneMapEntry, name: string) => {
            if (!isMobileLane(entry)) return;
            if (laneFilterSet && !laneFilterSet.has(name)) return;
            names.push(name);
        });
        return names;
    }, [laneMap, laneFilterSet]);

    const mobileSelection = useMemo<LaneSelection>(
        () => ({mode: 'include', lanes: mobileLaneNames}),
        [mobileLaneNames.join(',')]
    );

    const adjudicationMap = useAdjudicationMap(laneMap, enabled && showAlarmMarkers && mobileLaneNames.length > 0);
    // Ref mirror so addAlarmMarker (called from long-lived effects/handlers
    // with stale closures) always checks the latest adjudication state
    const adjMapRef = useRef(adjudicationMap);
    adjMapRef.current = adjudicationMap;
    // Historical markers must wait for the adjudication statuses, or every
    // previously-adjudicated alarm flashes on the map until they arrive.
    // useAdjudicationMap publishes a fresh Map identity when its historical
    // fetch completes (even when empty), so the second identity we observe
    // means "adjudication data has loaded".
    const [adjLoaded, setAdjLoaded] = useState(false);
    const adjPublishes = useRef(0);

    const laneEntry = (laneName: string): LaneMapEntry | undefined => laneMap?.get(laneName);

    // ---- moving marker + trail ----

    function upsertMobileMarker(laneName: string, latlng: L.LatLng, tMillis: number) {
        const map = getMap();
        if (!map) return;

        const buf = fixBufferByLane.current.get(laneName) ?? [];
        buf.push({t: tMillis, lat: latlng.lat, lon: latlng.lng});
        if (buf.length > FIX_BUFFER_MAX) buf.splice(0, buf.length - FIX_BUFFER_MAX);
        fixBufferByLane.current.set(laneName, buf);

        let marker = markersByLane.current.get(laneName);
        if (!marker) {
            marker = L.marker(latlng, {icon: mobileIcon(laneName, false), zIndexOffset: 500}).addTo(map);
            marker.bindPopup(
                `<div class='point-popup'>
                    <strong>${laneName}</strong>
                    <hr/>
                    <button onclick='location.href="/lane-view"' class="popup-button" type="button">VIEW LANE</button>
                </div>`
            );
            marker.on('click', () => dispatch(setCurrentLane(laneName)));
            markersByLane.current.set(laneName, marker);
            // Join the initial fitBounds exactly once; live fixes must never
            // fight the user's pan/zoom afterwards
            onFirstFix?.(latlng);
        } else {
            marker.setLatLng(latlng);
        }

        if (showTrail) {
            let trail = trailByLane.current.get(laneName);
            if (!trail) {
                trail = L.polyline([latlng], {className: 'mobile-trail', color: MOBILE_NORMAL_COLOR, weight: 3, opacity: 0.6}).addTo(map);
                trailByLane.current.set(laneName, trail);
            } else {
                const pts = trail.getLatLngs() as L.LatLng[];
                pts.push(latlng);
                trail.setLatLngs(pts.slice(-Math.max(2, trailLength)));
            }
        }
    }

    function flashMobileAlarm(laneName: string) {
        const marker = markersByLane.current.get(laneName);
        if (!marker) return;
        marker.setIcon(mobileIcon(laneName, true));
        const existing = alarmFlashTimer.current.get(laneName);
        if (existing) clearTimeout(existing);
        alarmFlashTimer.current.set(laneName, setTimeout(() => {
            markersByLane.current.get(laneName)?.setIcon(mobileIcon(laneName, false));
        }, MOBILE_ALARM_FLASH_MS));
    }

    useLaneStreams(mobileSelection, ['locRT'], (laneName, _stream, message) => {
        for (const value of message?.values ?? []) {
            const fix = readFix(value?.data);
            if (!fix) continue;
            const t = typeof value?.data?.samplingTime === 'number'
                ? value.data.samplingTime * 1000
                : Date.now();
            upsertMobileMarker(laneName, L.latLng(fix.lat, fix.lon), t);
        }
    }, enabled && mapReady && mobileLaneNames.length > 0);

    // Seed each walker's marker from the latest stored fix so it appears even
    // before the first live message (or while the unit is stationary/offline)
    useEffect(() => {
        if (!enabled || !mapReady) return;
        let cancelled = false;
        (async () => {
            for (const laneName of mobileLaneNames) {
                if (seededInitialPos.current.has(laneName)) continue;
                const entry = laneEntry(laneName);
                const locDs = entry?.datastreams.find((ds: any) => {
                    try {
                        return ds?.properties?.observedProperties?.[0]?.definition
                            && (ds.properties.observedProperties[0].definition.includes('SensorLocation')
                                || ds.properties.observedProperties[0].definition.includes('LocationVector'));
                    } catch {
                        return false;
                    }
                });
                if (!locDs) continue;
                seededInitialPos.current.add(laneName);
                try {
                    const page = await locDs.searchObservations(new ObservationFilter({resultTime: 'latest'}), 1);
                    const obs = (await page.nextPage())?.[0];
                    if (cancelled || !obs) continue;
                    const rec = obs.result ?? obs.properties?.result;
                    const fix = readFix(rec);
                    if (fix && !markersByLane.current.has(laneName))
                        upsertMobileMarker(laneName, L.latLng(fix.lat, fix.lon), Date.now());
                } catch (e) {
                    console.warn(`[mobile] failed to seed initial position for ${laneName}`, e);
                }
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, mapReady, mobileLaneNames.join(','), laneMap]);

    // ---- alarm markers (unadjudicated only) ----

    /** Code 0 is the "none" placeholder with an empty group, so a real
     *  adjudication is any status whose code carries a non-empty group. */
    function isAdjudicated(obsId: string | null | undefined): boolean {
        if (!obsId) return false;
        const group = adjMapRef.current.get(obsId)?.adjudicationCode?.group;
        return typeof group === 'string' && group.length > 0;
    }

    function removeAlarmMarker(key: number) {
        const entry = alarmMarkers.current.get(key);
        if (!entry) return;
        entry.marker.remove();
        alarmMarkers.current.delete(key);
        // Remember it so a live re-delivery or historical re-fetch that runs
        // before the adjudication map refreshes can't resurrect the marker
        adjudicatedKeys.current.add(key);
    }

    function resolveAlarmPosition(laneName: string, result: any): L.LatLng | null {
        // 1. embedded coordinates from the occupancy process (authoritative)
        if (typeof result?.latitude === 'number' && typeof result?.longitude === 'number'
            && (result.latitude !== 0 || result.longitude !== 0)) {
            return L.latLng(result.latitude, result.longitude);
        }
        // 2. time-join against the recent-fix ring buffer
        const t = Date.parse(result?.startTime ?? '');
        if (!Number.isNaN(t)) {
            const buf = fixBufferByLane.current.get(laneName) ?? [];
            let best: Fix | null = null;
            for (const f of buf) {
                if (!best || Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
            }
            if (best && Math.abs(best.t - t) <= FIX_JOIN_MAX_DELTA_MS)
                return L.latLng(best.lat, best.lon);
        }
        // 3. fall back to the walker's current position (approximate)
        const marker = markersByLane.current.get(laneName);
        return marker ? marker.getLatLng() : null;
    }

    async function addAlarmMarker(entry: LaneMapEntry, obs: any, isLive: boolean) {
        const map = getMap();
        if (!map) return;

        const result = isLive ? (obs.result ?? obs) : (obs.properties?.result ?? obs.result);
        if (!result) return;
        const isAlarm = result.gammaAlarm || result.neutronAlarm
            || (typeof result.alarmCategoryCode === 'string' && result.alarmCategoryCode.trim().length > 0);
        if (!isAlarm) return;

        const laneName = entry.laneName;
        const key = hashString(`${result.occupancyCount}${laneName}${result.startTime}${result.endTime}`);
        if (alarmMarkers.current.has(key) || adjudicatedKeys.current.has(key)) return;

        let obsId: string | null = isLive ? null : (obs.id ?? obs.properties?.id ?? null);
        // Adjudicated events don't belong on the map at all
        if (isAdjudicated(obsId)) {
            adjudicatedKeys.current.add(key);
            return;
        }

        const latlng = resolveAlarmPosition(laneName, result);
        if (!latlng) {
            console.warn(`[mobile] no position for alarm on ${laneName} @ ${result.startTime}; marker skipped`);
            return;
        }

        const eventData = new EventTableData(key, laneName, result, obsId,
            obs['foi@id'] ?? obs.properties?.foiId ?? null, entry.parentNode?.name, entry.isRS350Backpack);

        const marker = L.circleMarker(latlng, {
            className: 'mobile-alarm-marker',
            radius: 7,
            weight: 2,
            color: MOBILE_ALARM_COLOR,
            fillColor: MOBILE_ALARM_COLOR,
            fillOpacity: 0.15,
            opacity: 1,
        }).addTo(map);
        marker.bindPopup(
            `<div class='point-popup'>
                <strong>${laneName}</strong> — ${eventData.status}
                <br/><span style="font-size:0.85em">${result.startTime ?? ''}</span>
                <hr/>
                <button class="popup-button mobile-view-event" type="button">VIEW EVENT</button>
            </div>`
        );

        const markerEntry: AlarmMarkerEntry = {marker, eventData};
        alarmMarkers.current.set(key, markerEntry);
        // Tag the SVG element with the observation id (test hook + debugging)
        if (obsId)
            marker.getElement()?.setAttribute('data-occ-obs', obsId);

        // Prime redux ONLY on VIEW EVENT (not on marker click): dispatching
        // setEventPreview({isOpen:true}) opens the event-preview overlay, and
        // doing that on plain marker click churns the dashboard layout and
        // closes the Leaflet popup out from under the user.
        // The event-details page reads the event from (non-persisted) redux, so
        // navigation must be client-side — a location.href reload would drop it.
        marker.on('popupopen', (e: any) => {
            const btn = e?.popup?.getElement?.()?.querySelector?.('.mobile-view-event');
            btn?.addEventListener('click', () => {
                dispatch(setSelectedRowId(eventData.id));
                dispatch(setEventPreview({isOpen: true, eventData}));
                dispatch(setSelectedEvent(eventData));
                router.push('/event-details');
            }, {once: true});
        });

        // Live events carry no observation id; recover it so adjudication
        // state can be joined (same limitation/fix as the event table)
        if (isLive) {
            try {
                const occDs = entry.datastreams.find(isOccupancyDataStream);
                if (occDs && result.startTime) {
                    const page = await occDs.searchObservations(new ObservationFilter({
                        resultTime: `${result.startTime}/${result.endTime ?? result.startTime}`,
                    }), 10);
                    const items = await page.nextPage();
                    const match = (items ?? []).find((o: any) =>
                        (o.result ?? o.properties?.result)?.startTime === result.startTime);
                    if (match) {
                        obsId = match.id ?? match.properties?.id ?? null;
                        if (obsId) {
                            eventData.setOccupancyObsId(obsId);
                            marker.getElement()?.setAttribute('data-occ-obs', obsId);
                            if (isAdjudicated(obsId))
                                removeAlarmMarker(key);
                        }
                    }
                }
            } catch (e) {
                console.warn('[mobile] failed to back-fill occupancy obs id', e);
            }
        }
    }

    // Live alarms via the shared registry
    useLaneStreams(mobileSelection, ['occRT'], (laneName, _stream, message) => {
        const entry = laneEntry(laneName);
        if (!entry) return;
        for (const value of message?.values ?? []) {
            if (value?.data) {
                flashMobileAlarm(laneName);
                void addAlarmMarker(entry, value.data, true);
            }
        }
    }, enabled && mapReady && showAlarmMarkers && mobileLaneNames.length > 0);

    // Historical alarms over the configured window (only once adjudication
    // state is known, so adjudicated events never render at all)
    useEffect(() => {
        if (!enabled || !mapReady || !adjLoaded || !showAlarmMarkers || mobileLaneNames.length === 0) return;
        const key = `${alarmTimeWindow}|${mobileLaneNames.join(',')}`;
        if (historicalKey.current === key) return;
        historicalKey.current = key;

        let cancelled = false;
        (async () => {
            const startIso = new Date(windowStartMs(alarmTimeWindow)).toISOString();
            for (const laneName of mobileLaneNames) {
                const entry = laneEntry(laneName);
                const occDs = entry?.datastreams.find(isOccupancyDataStream);
                if (!occDs) continue;
                try {
                    const page = await occDs.searchObservations(new ObservationFilter({
                        resultTime: `${startIso}/${new Date().toISOString()}`,
                    }), 100);
                    let fetched = 0;
                    while (page.hasNext() && fetched < HISTORICAL_ALARMS_MAX && !cancelled) {
                        const items = await page.nextPage();
                        fetched += items?.length ?? 0;
                        for (const obs of items ?? []) {
                            await addAlarmMarker(entry, obs, false);
                        }
                    }
                } catch (e) {
                    console.warn(`[mobile] failed to load historical alarms for ${laneName}`, e);
                }
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, mapReady, adjLoaded, showAlarmMarkers, alarmTimeWindow, mobileLaneNames.join(','), laneMap]);

    // Drop markers whose event got adjudicated (live adjudications via the
    // command status stream, or statuses arriving after a live marker)
    useEffect(() => {
        adjPublishes.current += 1;
        // Identity #1 is the hook's initial state at mount; any later one is a
        // real publish from the historical fetch or the realtime subscription
        if (adjPublishes.current >= 2 && !adjLoaded)
            setAdjLoaded(true);
        for (const [key, entry] of Array.from(alarmMarkers.current.entries())) {
            if (isAdjudicated(entry.eventData.occupancyObsId))
                removeAlarmMarker(key);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adjudicationMap]);

    // Teardown: remove all Leaflet artifacts when disabled or unmounted.
    // Registry streams stay connected by design (never-disconnect policy);
    // useLaneStreams releases our handlers automatically.
    useEffect(() => {
        if (enabled) return;
        teardown();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    useEffect(() => () => teardown(), []); // eslint-disable-line react-hooks/exhaustive-deps

    function teardown() {
        for (const m of markersByLane.current.values()) m.remove();
        for (const t of trailByLane.current.values()) t.remove();
        for (const a of alarmMarkers.current.values()) a.marker.remove();
        for (const timer of alarmFlashTimer.current.values()) clearTimeout(timer);
        markersByLane.current.clear();
        trailByLane.current.clear();
        alarmMarkers.current.clear();
        adjudicatedKeys.current.clear();
        alarmFlashTimer.current.clear();
        fixBufferByLane.current.clear();
        seededInitialPos.current.clear();
        historicalKey.current = '';
    }
}
