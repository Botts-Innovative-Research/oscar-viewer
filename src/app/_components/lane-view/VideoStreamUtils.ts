import ControlStream from "osh-js/source/core/consysapi/controlstream/ControlStream";
import {LaneMapEntry} from "@/lib/data/oscar/LaneCollection";
import {isHLSVideoControlStream} from "@/lib/data/oscar/Utilities";

export function getUniqueVideoControlStreams(
    laneEntry: Pick<LaneMapEntry, "controlStreams"> | null | undefined,
): typeof ControlStream[] {
    if (!laneEntry || !Array.isArray(laneEntry.controlStreams))
        return [];

    const seenIds = new Set<string>();
    return laneEntry.controlStreams.filter((stream: typeof ControlStream) => {
        if (!isHLSVideoControlStream(stream))
            return false;

        const id = stream?.properties?.id;
        if (typeof id !== "string" || seenIds.has(id))
            return false;

        seenIds.add(id);
        return true;
    });
}

/**
 * Serializes generation cleanup behind the generation's current start task.
 * This prevents a late stop for an old generation from racing with the next
 * generation's start command.
 */
export async function stopStreamAfterStartSettles(
    startTask: Promise<unknown>,
    wasStartLaunched: () => boolean,
    stopStream: () => Promise<void>,
): Promise<void> {
    try {
        await startTask;
    } catch {
        // A failed start can still have changed server state. Cleanup must
        // continue to the stop command when the request was launched.
    }

    if (wasStartLaunched())
        await stopStream();
}

function abortError(): Error {
    const error = new Error("Command request was aborted");
    error.name = "AbortError";
    return error;
}

/**
 * Runs a command with both an externally abortable signal and a hard deadline.
 * The abort race also settles when a test double or non-fetch implementation
 * ignores AbortSignal, so a dead request cannot block subsequent generations.
 */
export async function runAbortableWithTimeout<T>(
    controller: AbortController,
    timeoutMs: number,
    operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    const signal = controller.signal;
    let handleAbort: () => void = () => undefined;
    const aborted = new Promise<never>((_resolve, reject) => {
        handleAbort = () => reject(abortError());
        if (signal.aborted)
            handleAbort();
        else
            signal.addEventListener("abort", handleAbort, {once: true});
    });
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await Promise.race([operation(signal), aborted]);
    } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", handleAbort);
    }
}
