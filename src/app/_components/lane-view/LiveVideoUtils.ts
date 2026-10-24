import {INode} from "@/lib/data/osh/Node";

type LiveVideoNode = Pick<INode,
    "address" | "port" | "isSecure" | "isDefaultNode" | "oshPathRoot" | "bucketsEndpoint">;

function normalizeConfiguredPath(path: string, fallback: string): string {
    const normalized = normalizeResourcePath(path || fallback);
    return normalized ? `/${normalized}` : "";
}

function fullyDecodePath(path: string): string | null {
    let decoded = path;
    for (let pass = 0; pass < 16; pass++) {
        let next: string;
        try {
            next = decodeURIComponent(decoded);
        } catch {
            return null;
        }
        if (next === decoded)
            return decoded;
        decoded = next;
    }

    // Reject pathological nesting rather than letting a downstream server's
    // additional decoding turn it into a path separator or dot segment.
    return null;
}

function normalizeResourcePath(path: string): string {
    const decoded = fullyDecodePath(path);
    if (decoded === null)
        return "";

    const segments: string[] = [];
    decoded.replace(/\\/g, "/").split("/").forEach((segment) => {
        if (!segment || segment === ".")
            return;
        if (segment === "..") {
            segments.pop();
            return;
        }
        // Encode every accepted segment after canonicalization so encoded
        // slashes and dots cannot regain structural meaning in the browser.
        segments.push(encodeURIComponent(segment));
    });
    return segments.join("/");
}

/**
 * Builds the URL used for a live HLS playlist.
 *
 * Stream paths are service data rather than trusted navigation targets, so an
 * absolute path returned by a command is reduced to its path/query and rebuilt
 * against the configured node. The local/default node deliberately uses a
 * relative URL so authentication remains same-origin and a configured hostname
 * cannot accidentally bypass the reverse proxy.
 */
export function buildLiveVideoUrl(videoSource: string, node: LiveVideoNode): string {
    const rootPath = normalizeConfiguredPath(node.oshPathRoot, "/sensorhub");
    const bucketPath = normalizeConfiguredPath(node.bucketsEndpoint, "/buckets");

    let source = videoSource.trim();
    if (/^https?:\/\//i.test(source)) {
        try {
            const parsed = new URL(source);
            source = `${parsed.pathname}${parsed.search}`;
        } catch {
            // Rebuild malformed values against the node below instead of
            // allowing them to become an external navigation target.
        }
    }

    const suffixIndex = source.search(/[?#]/);
    const suffix = suffixIndex >= 0 ? source.substring(suffixIndex) : "";
    let resourcePath = normalizeResourcePath(
        suffixIndex >= 0 ? source.substring(0, suffixIndex) : source,
    );

    const rootWithoutSlash = rootPath.substring(1);
    const bucketWithoutSlash = bucketPath.substring(1);
    const fullPrefix = [rootWithoutSlash, bucketWithoutSlash].filter(Boolean).join("/");
    for (const prefix of [fullPrefix, bucketWithoutSlash].filter(Boolean)) {
        if (resourcePath === prefix) {
            resourcePath = "";
            break;
        }
        if (resourcePath.startsWith(`${prefix}/`)) {
            resourcePath = resourcePath.substring(prefix.length + 1);
            break;
        }
    }

    const resourceSuffix = resourcePath ? `/${resourcePath}` : "";
    const relativeUrl = `${rootPath}${bucketPath}${resourceSuffix}${suffix}`;
    if (node.isDefaultNode)
        return relativeUrl;

    const protocol = node.isSecure ? "https" : "http";
    return `${protocol}://${node.address}:${node.port}${relativeUrl}`;
}
