export interface FederationNodeSummary {
    uid: string;
    local: boolean;
    enabled: boolean;
    upstreamBaseUrl?: string;
}

export interface RegisterFederationNodeRequest {
    upstreamBaseUrl: string;
    username: string;
    password: string;
    allowPrivateNetwork?: boolean;
    enabled?: boolean;
}

/**
 * Client for authenticated server-side federation management. Registration
 * credentials are sent once and must never be placed in localStorage.
 */
export class FederationClient {
    constructor(private readonly gatewayUrl: string) {}

    get endpoint(): string {
        return `${this.gatewayUrl.replace(/\/+$/, "")}/federation/nodes`;
    }

    async listNodes(): Promise<FederationNodeSummary[]> {
        return this.request<FederationNodeSummary[]>(this.endpoint, {method: "GET"});
    }

    async registerNode(_request: RegisterFederationNodeRequest): Promise<FederationNodeSummary> {
        return this.request<FederationNodeSummary>(this.endpoint, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(_request),
        });
    }

    async updateNode(uid: string, request: RegisterFederationNodeRequest): Promise<FederationNodeSummary> {
        return this.request<FederationNodeSummary>(`${this.endpoint}/${encodeURIComponent(uid)}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(request),
        });
    }

    async removeNode(uid: string): Promise<void> {
        await this.request<void>(`${this.endpoint}/${encodeURIComponent(uid)}`, {method: "DELETE"});
    }

    private async request<T>(url: string, init: RequestInit): Promise<T> {
        const response = await fetch(url, {...init, credentials: "same-origin"});
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || `Federation request failed with HTTP ${response.status}`);
        }
        if (response.status === 204) return undefined as T;
        return response.json() as Promise<T>;
    }
}
