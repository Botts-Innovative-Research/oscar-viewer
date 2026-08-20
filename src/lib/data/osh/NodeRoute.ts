/** Canonical OSCAR node identity, independent of how this browser reaches it. */
export interface OscarNodeIdentity {
    uid: string;
    name?: string;
}

export interface DirectNodeRoute {
    type: "direct";
    baseUrl: string;
}

export interface FederatedNodeRoute {
    type: "federated";
    gatewayUrl: string;
    targetUid: string;
}

export type NodeRoute = DirectNodeRoute | FederatedNodeRoute;

export interface RoutedOscarNode {
    identity: OscarNodeIdentity;
    route: NodeRoute;
}

function withoutTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

/**
 * Builds the transport root while keeping node identity separate from route.
 * Node uses this helper for both direct and federated connections.
 */
export function resolveRouteBaseUrl(route: NodeRoute): string {
    if (route.type === "direct") {
        return withoutTrailingSlash(route.baseUrl);
    }

    return `${withoutTrailingSlash(route.gatewayUrl)}/federation/${encodeURIComponent(route.targetUid)}`;
}

export function resolveConnectedSystemsUrl(
    route: NodeRoute,
    oshPathRoot = "/sensorhub",
    apiEndpoint = "/api",
): string {
    return `${resolveRouteBaseUrl(route)}${oshPathRoot}${apiEndpoint}`;
}

export function resolveMqttWebSocketUrl(
    route: NodeRoute,
    directMqttPath = "/sensorhub/api",
): string {
    if (route.type === "federated") {
        const url = new URL(`${resolveRouteBaseUrl(route)}/mqtt`);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return url.toString();
    }

    const url = new URL(`${resolveRouteBaseUrl(route)}${directMqttPath}`);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
}
