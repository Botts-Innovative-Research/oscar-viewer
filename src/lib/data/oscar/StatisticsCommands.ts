import {INode} from "@/lib/data/osh/Node";
import {sendCommand} from "@/lib/data/oscar/OSCARCommands";


export const DEFAULT_STATISTICS_COMMAND_TIMEOUT_MS = 20 * 60 * 1000;
export const DEFAULT_STATISTICS_POLL_INTERVAL_MS = 1000;

export interface StatisticsCommandResult {
    data?: Record<string, unknown>;
    "observation@id"?: string;
}

export interface StatisticsCommandStatus {
    "command@id"?: string;
    message?: string;
    results?: StatisticsCommandResult[];
    statusCode?: string;
}

interface StatisticsControlStream {
    properties: {
        id: string;
        "system@id"?: string;
    };
}

type SendCommandImplementation = typeof sendCommand;
type DelayImplementation = (milliseconds: number, signal: AbortSignal) => Promise<void>;

export interface StatisticsCommandOptions {
    delayImpl?: DelayImplementation;
    fetchImpl?: typeof fetch;
    pollIntervalMs?: number;
    sendCommandImpl?: SendCommandImplementation;
    signal?: AbortSignal;
    timeoutMs?: number;
}

export class StatisticsCommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StatisticsCommandError";
    }
}

export class StatisticsCommandTimeoutError extends StatisticsCommandError {
    constructor(timeoutMs: number) {
        super(`Statistics command did not complete within ${timeoutMs}ms`);
        this.name = "StatisticsCommandTimeoutError";
    }
}

const IN_PROGRESS_CODES = new Set(["PENDING", "EXECUTING", "SCHEDULED", "UPDATED"]);
const FAILURE_CODES = new Set(["FAILED", "REJECTED", "CANCELED"]);

function hasResult(status: StatisticsCommandStatus): boolean {
    return Array.isArray(status.results) && status.results.length > 0;
}

function isSuccessful(status: StatisticsCommandStatus): boolean {
    return status.statusCode === "COMPLETED"
        || (status.statusCode === "ACCEPTED" && hasResult(status));
}

function throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted)
        return;

    if (signal.reason instanceof Error)
        throw signal.reason;

    throw new DOMException("Statistics command was aborted", "AbortError");
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, milliseconds);
        const onAbort = () => {
            window.clearTimeout(timeout);
            reject(signal.reason instanceof Error
                ? signal.reason
                : new DOMException("Statistics command was aborted", "AbortError"));
        };
        signal.addEventListener("abort", onAbort, {once: true});
    });
}

function commandStatusUrl(
    node: INode,
    controlStream: StatisticsControlStream,
    commandId: string,
): string {
    const systemId = controlStream.properties["system@id"];
    const controlStreamId = controlStream.properties.id;
    if (!systemId || !controlStreamId)
        throw new StatisticsCommandError("Statistics control stream is missing its system or stream ID");

    return `${node.getConnectedSystemsEndpoint(false)}`
        + `/systems/${encodeURIComponent(systemId)}`
        + `/controlstreams/${encodeURIComponent(controlStreamId)}`
        + `/commands/${encodeURIComponent(commandId)}`
        + "/status?order=desc&limit=1";
}

async function fetchLatestCommandStatus(
    node: INode,
    controlStream: StatisticsControlStream,
    commandId: string,
    fetchImpl: typeof fetch,
    signal: AbortSignal,
): Promise<StatisticsCommandStatus | undefined> {
    const response = await fetchImpl(commandStatusUrl(node, controlStream, commandId), {
        method: "GET",
        credentials: "include",
        headers: {
            ...node.getBasicAuthHeader(),
            Accept: "application/json",
        },
        signal,
    });
    if (!response.ok)
        throw new StatisticsCommandError(`Statistics status request failed with status ${response.status}`);

    const payload = await response.json();
    return Array.isArray(payload?.items) ? payload.items[0] : undefined;
}

function evaluateStatus(status: StatisticsCommandStatus): "success" | "wait" {
    if (isSuccessful(status))
        return "success";

    const statusCode = status.statusCode;
    if (statusCode && FAILURE_CODES.has(statusCode))
        throw new StatisticsCommandError(
            status.message || `Statistics command ended with status ${statusCode}`,
        );

    if (statusCode === "ACCEPTED" || (statusCode && IN_PROGRESS_CODES.has(statusCode)))
        return "wait";

    throw new StatisticsCommandError(
        statusCode
            ? `Statistics command returned unsupported status ${statusCode}`
            : "Statistics command response did not include a status code",
    );
}

function createDeadlineSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const onParentAbort = () => controller.abort(
        parentSignal?.reason instanceof Error
            ? parentSignal.reason
            : new DOMException("Statistics command was aborted", "AbortError"),
    );

    if (parentSignal?.aborted)
        onParentAbort();
    else
        parentSignal?.addEventListener("abort", onParentAbort, {once: true});

    const timeout = window.setTimeout(
        () => controller.abort(new StatisticsCommandTimeoutError(timeoutMs)),
        timeoutMs,
    );

    return {
        signal: controller.signal,
        dispose: () => {
            window.clearTimeout(timeout);
            parentSignal?.removeEventListener("abort", onParentAbort);
        },
    };
}

/**
 * Executes a statistics command and does not resolve until the durable command status is terminal.
 * The server emits PENDING after its acknowledgement deadline, so an HTTP 2xx response alone is
 * not evidence that the statistics query has completed.
 */
export async function executeStatisticsCommand(
    node: INode,
    controlStream: StatisticsControlStream,
    command: string,
    options: StatisticsCommandOptions = {},
): Promise<StatisticsCommandStatus> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_STATISTICS_COMMAND_TIMEOUT_MS;
    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_STATISTICS_POLL_INTERVAL_MS;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
        throw new StatisticsCommandError("Statistics command timeout must be positive");
    if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 0)
        throw new StatisticsCommandError("Statistics command poll interval cannot be negative");

    const sendCommandImpl = options.sendCommandImpl ?? sendCommand;
    const fetchImpl = options.fetchImpl ?? fetch;
    const delayImpl = options.delayImpl ?? delay;
    const deadline = createDeadlineSignal(options.signal, timeoutMs);

    try {
        throwIfAborted(deadline.signal);
        const response = await sendCommandImpl(
            node,
            controlStream.properties.id,
            command,
            {signal: deadline.signal},
        );
        if (!response.ok)
            throw new StatisticsCommandError(`Statistics request failed with status ${response.status}`);

        let status = await response.json() as StatisticsCommandStatus;
        if (evaluateStatus(status) === "success")
            return status;

        const commandId = status["command@id"];
        if (!commandId)
            throw new StatisticsCommandError("Pending statistics response did not include a command ID");

        while (true) {
            await delayImpl(pollIntervalMs, deadline.signal);
            throwIfAborted(deadline.signal);
            const latestStatus = await fetchLatestCommandStatus(
                node,
                controlStream,
                commandId,
                fetchImpl,
                deadline.signal,
            );
            if (!latestStatus)
                continue;

            status = latestStatus;
            if (evaluateStatus(status) === "success")
                return status;
        }
    } catch (error) {
        if (deadline.signal.aborted && deadline.signal.reason instanceof Error)
            throw deadline.signal.reason;
        throw error;
    } finally {
        deadline.dispose();
    }
}

export function getInlineStatisticsResult(status: StatisticsCommandStatus): Record<string, unknown> {
    const data = status.results?.[0]?.data;
    if (!data)
        throw new StatisticsCommandError("Completed statistics command did not include inline results");
    return data;
}

export async function getObservationStatisticsResult(
    node: INode,
    status: StatisticsCommandStatus,
    signal?: AbortSignal,
): Promise<Record<string, unknown>> {
    if (signal)
        throwIfAborted(signal);

    const observationId = status.results?.[0]?.["observation@id"];
    if (!observationId)
        throw new StatisticsCommandError("Completed statistics command did not include an observation ID");

    const observation = await node.getObservationsApi().getObservationById(observationId);
    if (signal)
        throwIfAborted(signal);
    const result = observation?.properties?.result;
    if (!result)
        throw new StatisticsCommandError(`Statistics observation ${observationId} did not include results`);
    return result;
}
