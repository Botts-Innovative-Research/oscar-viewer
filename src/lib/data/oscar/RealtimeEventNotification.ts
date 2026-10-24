import {EventType} from "osh-js/source/core/event/EventType";

import type {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import type {EventTableData} from "@/lib/data/oscar/TableHelpers";
import {
    EventLookupError,
    resolveEventObservationId,
} from "@/lib/data/oscar/EventLookup";

const REALTIME_ID_LOOKUP_REQUEST_TIMEOUT_MS = 1_500;
export const REALTIME_ID_RETRY_DELAYS_MS = [250, 500, 1_000, 2_000, 3_000] as const;

type RealtimeEventIdResolver = typeof resolveEventObservationId;
export type RealtimeEventHandler = (message: any) => void;

/**
 * OSH's public datasource wrapper exposes subscribe(), but not unsubscribe().
 * The listener registry lives on the wrapped realtime datasource. Remove the
 * exact callback there so a filter change cannot leave a stale event handler.
 */
export function removeRealtimeEventSubscription(
    source: any,
    handler: RealtimeEventHandler,
    eventType: string = EventType.DATA,
): void {
    const maps = [
        source?.eventSubscriptionMap,
        source?.timeSeriesDataSource?.eventSubscriptionMap,
    ].filter((value, index, values) => value && values.indexOf(value) === index);

    maps.forEach(subscriptionMap => {
        const listeners = subscriptionMap[eventType];
        if (!Array.isArray(listeners)) return;
        for (let index = listeners.length - 1; index >= 0; index--) {
            if (listeners[index] === handler) listeners.splice(index, 1);
        }
    });
}

function cloneEventWithObservationId(event: EventTableData, occupancyObsId: string): EventTableData {
    return Object.assign(
        Object.create(Object.getPrototypeOf(event)),
        event,
        {occupancyObsId},
    );
}

function waitForRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
    if (milliseconds <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
            return;
        }

        const timeout = window.setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, milliseconds);
        const onAbort = () => {
            window.clearTimeout(timeout);
            reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort, {once: true});
    });
}

/**
 * Gives a freshly received event a short window to acquire its durable REST
 * resource ID. The original event is returned after bounded failures so alarm
 * notification delivery never depends on persistence timing.
 */
export async function resolveRealtimeEventForNotification(
    event: EventTableData,
    lane: LaneMapEntry,
    signal?: AbortSignal,
    resolver: RealtimeEventIdResolver = resolveEventObservationId,
    retryDelays: readonly number[] = REALTIME_ID_RETRY_DELAYS_MS,
): Promise<EventTableData> {
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        try {
            const eventId = await resolver(
                event,
                lane,
                fetch,
                signal,
                REALTIME_ID_LOOKUP_REQUEST_TIMEOUT_MS,
            );
            return cloneEventWithObservationId(event, eventId);
        } catch (error) {
            if (signal?.aborted) return event;
            const retryable = error instanceof EventLookupError
                && (error.code === "not-found" || error.code === "unavailable");
            if (!retryable || attempt >= retryDelays.length) return event;
            try {
                await waitForRetry(retryDelays[attempt], signal);
            } catch {
                return event;
            }
        }
    }
    return event;
}
