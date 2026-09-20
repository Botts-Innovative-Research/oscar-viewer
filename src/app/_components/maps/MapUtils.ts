import {INode} from "@/lib/data/osh/Node";

// OSM's tile policy requires this exact hostname. Do not restore Leaflet's
// historical a/b/c subdomains; OSM may return policy-block tiles for them.
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const SITE_DIAGRAM_PANE = "site-diagram";
export const LANE_MARKER_PANE = "lane-markers";

// Leaflet renders tiles at 200, ordinary image overlays at 400, and markers at
// 600. Keeping site diagrams at 450 makes them the top raster layer without
// hiding lane markers or their popups.
export const SITE_DIAGRAM_PANE_Z_INDEX = 450;
export const LANE_MARKER_PANE_Z_INDEX = 650;

// Zero padding and fractional zoom make the initial viewport the tightest
// possible fit for the coordinates supplied when the diagram was uploaded.
export const SITE_DIAGRAM_FIT_OPTIONS = {
    animate: false,
    padding: [0, 0] as [number, number],
};

export type SiteDiagramBounds = [
    [latitude: number, longitude: number],
    [latitude: number, longitude: number]
];

interface GeographicPoint {
    lat: number;
    lon: number;
}

interface SiteBoundingBox {
    lowerLeftBound: GeographicPoint;
    upperRightBound: GeographicPoint;
}

export interface LaneMapLocation {
    lat: number;
    lon: number;
    alt: number;
}

type SiteDiagramNode = Pick<INode,
    "address" | "port" | "isSecure" | "oshPathRoot" | "bucketsEndpoint">;

function normalizeUrlPath(path: string, fallback: string): string {
    const normalized = (path || fallback).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    return normalized ? `/${normalized}` : "";
}

export function buildSiteDiagramUrl(path: string, node: SiteDiagramNode): string {
    if (/^https?:\/\//i.test(path))
        return path;

    const protocol = node.isSecure ? "https" : "http";
    const rootPath = normalizeUrlPath(node.oshPathRoot, "/sensorhub");
    const bucketPath = normalizeUrlPath(node.bucketsEndpoint, "/buckets");
    const bucketPathWithoutLeadingSlash = bucketPath.substring(1);
    let resourcePath = path.replace(/\\/g, "/").replace(/^\/+/, "");

    // Accept either the relative value published by the service
    // (sitemap/file.png) or a value that already includes the bucket endpoint.
    if (resourcePath === bucketPathWithoutLeadingSlash)
        resourcePath = "";
    else if (resourcePath.startsWith(`${bucketPathWithoutLeadingSlash}/`))
        resourcePath = resourcePath.substring(bucketPathWithoutLeadingSlash.length + 1);

    const resourceSuffix = resourcePath ? `/${resourcePath}` : "";
    return `${protocol}://${node.address}:${node.port}${rootPath}${bucketPath}${resourceSuffix}`;
}

export function toLeafletSiteDiagramBounds(siteBoundingBox: SiteBoundingBox): SiteDiagramBounds | null {
    const lowerLeft = siteBoundingBox?.lowerLeftBound;
    const upperRight = siteBoundingBox?.upperRightBound;
    const coordinates = [lowerLeft?.lat, lowerLeft?.lon, upperRight?.lat, upperRight?.lon];

    if (!coordinates.every(Number.isFinite))
        return null;

    if (Math.abs(lowerLeft.lat) > 90 || Math.abs(upperRight.lat) > 90 ||
        Math.abs(lowerLeft.lon) > 180 || Math.abs(upperRight.lon) > 180)
        return null;

    if (lowerLeft.lat >= upperRight.lat || lowerLeft.lon >= upperRight.lon)
        return null;

    return [
        [lowerLeft.lat, lowerLeft.lon],
        [upperRight.lat, upperRight.lon],
    ];
}

export function toLaneMapLocation(result: unknown): LaneMapLocation | null {
    const location = (result as {location?: {lat?: unknown; lon?: unknown; alt?: unknown}})?.location;
    const lat = location?.lat;
    const lon = location?.lon;
    const alt = location?.alt ?? 0;

    if (typeof lat !== "number" || typeof lon !== "number" || typeof alt !== "number" ||
        !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(alt))
        return null;

    if (Math.abs(lat) > 90 || Math.abs(lon) > 180)
        return null;

    return {lat, lon, alt};
}

export function toLaneMapLocationFromSystem(system: unknown): LaneMapLocation | null {
    const rawSystem = system as {
        geometry?: unknown;
        properties?: {
            geometry?: unknown;
            properties?: {geometry?: unknown};
        };
    };
    const geometryCandidates = [
        rawSystem?.geometry,
        rawSystem?.properties?.geometry,
        rawSystem?.properties?.properties?.geometry,
    ];

    for (const candidate of geometryCandidates) {
        const geometry = candidate as {type?: unknown; coordinates?: unknown};
        if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates))
            continue;

        // GeoJSON point coordinates are ordered longitude, latitude, altitude.
        const [lon, lat, rawAlt = 0] = geometry.coordinates;
        const alt = rawAlt ?? 0;
        if (typeof lat !== "number" || typeof lon !== "number" || typeof alt !== "number" ||
            !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(alt))
            continue;
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180)
            continue;

        return {lat, lon, alt};
    }

    return null;
}
