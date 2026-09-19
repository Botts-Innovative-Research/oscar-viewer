import {INode} from "@/lib/data/osh/Node";

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const SITE_DIAGRAM_PANE = "site-diagram";

// Leaflet renders tiles at 200, ordinary image overlays at 400, and markers at
// 600. Keeping site diagrams at 450 makes them the top raster layer without
// hiding lane markers or their popups.
export const SITE_DIAGRAM_PANE_Z_INDEX = 450;

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
