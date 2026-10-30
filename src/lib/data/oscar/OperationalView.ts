export const OPERATIONAL_VIEW_KEYWORD_PREFIX = "oscar:view:";
export const OPERATIONAL_VIEW_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export interface OperationalViewSelection {
    key: string | null;
    error: "invalid" | null;
}

export interface OperationalViewLane {
    uid: string;
    name: string;
}

export interface OperationalViewCatalog {
    lanes: OperationalViewLane[];
    views: Map<string, OperationalViewLane[]>;
}

export function emptyOperationalViewCatalog(): OperationalViewCatalog {
    return {lanes: [], views: new Map()};
}

export function parseOperationalView(search: string): OperationalViewSelection {
    const params = new URLSearchParams(search);
    if (!params.has("view"))
        return {key: null, error: null};

    if (params.getAll("view").length !== 1)
        return {key: null, error: "invalid"};

    const key = params.get("view") ?? "";
    if (!OPERATIONAL_VIEW_KEY_PATTERN.test(key))
        return {key: null, error: "invalid"};

    return {key, error: null};
}

export function getOperationalViewKeys(system: any): string[] {
    const keywords = system?.properties?.properties?.keywords;
    if (!Array.isArray(keywords))
        return [];

    return keywords
        .filter((keyword): keyword is string => typeof keyword === "string")
        .filter((keyword) => keyword.startsWith(OPERATIONAL_VIEW_KEYWORD_PREFIX))
        .map((keyword) => keyword.substring(OPERATIONAL_VIEW_KEYWORD_PREFIX.length));
}

export function buildOperationalViewCatalog(systems: any[]): OperationalViewCatalog {
    const lanes: OperationalViewLane[] = [];
    const views = new Map<string, OperationalViewLane[]>();

    systems.forEach((system) => {
        const uid = system?.properties?.properties?.uid;
        if (typeof uid !== "string" || !uid.startsWith("urn:osh:system:lane:"))
            return;

        const lane = {
            uid,
            name: system?.properties?.properties?.name || uid,
        };
        lanes.push(lane);

        getOperationalViewKeys(system).forEach((key) => {
            if (!OPERATIONAL_VIEW_KEY_PATTERN.test(key))
                return;
            const assignedLanes = views.get(key) ?? [];
            if (!assignedLanes.some((assignedLane) => assignedLane.uid === uid))
                assignedLanes.push(lane);
            views.set(key, assignedLanes);
        });
    });

    const compareLanes = (a: OperationalViewLane, b: OperationalViewLane) =>
        a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid);
    lanes.sort(compareLanes);

    return {
        lanes,
        views: new Map([...views.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, assignedLanes]) => [key, assignedLanes.sort(compareLanes)])),
    };
}

export function systemMatchesOperationalView(system: any, viewKey: string | null): boolean {
    return viewKey === null || getOperationalViewKeys(system).includes(viewKey);
}

export function withOperationalView(path: string, viewKey: string | null): string {
    if (viewKey === null)
        return path;

    const url = new URL(path, "https://oscar.local");
    url.searchParams.set("view", viewKey);
    return `${url.pathname}${url.search}${url.hash}`;
}
