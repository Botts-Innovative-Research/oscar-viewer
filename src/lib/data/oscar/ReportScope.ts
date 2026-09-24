import {OperationalViewCatalog} from "@/lib/data/oscar/OperationalView";

export type ReportScope = "NODE" | "OPERATIONAL_VIEW" | "LANES";
export type ReportScopeError = "view-required" | "empty-view" | "lanes-required" | "lanes-unavailable";

export interface ResolvedReportScope {
    laneUIDs: string[];
    error: ReportScopeError | null;
}

export function resolveReportScope(
    scope: ReportScope,
    reportType: string | null,
    selectedViewKey: string,
    selectedLaneUIDs: string[],
    catalog: OperationalViewCatalog,
): ResolvedReportScope {
    if (scope === "OPERATIONAL_VIEW") {
        if (!selectedViewKey)
            return {laneUIDs: [], error: "view-required"};
        const lanes = catalog.views.get(selectedViewKey) ?? [];
        if (lanes.length === 0)
            return {laneUIDs: [], error: "empty-view"};
        return {laneUIDs: lanes.map((lane) => lane.uid), error: null};
    }

    if (scope === "LANES") {
        if (selectedLaneUIDs.length === 0)
            return {laneUIDs: [], error: "lanes-required"};
        const availableUIDs = new Set(catalog.lanes.map((lane) => lane.uid));
        const laneUIDs = [...new Set(selectedLaneUIDs)].filter((uid) => availableUIDs.has(uid));
        return laneUIDs.length > 0
            ? {laneUIDs, error: null}
            : {laneUIDs: [], error: "lanes-unavailable"};
    }

    // Site and event reports use the backend's native unscoped query. Lane and
    // adjudication reports require concrete lane identifiers, so "Entire node"
    // expands to every lane discovered for that node.
    if (["LANE", "ADJUDICATION"].includes(reportType ?? "")) {
        const laneUIDs = catalog.lanes.map((lane) => lane.uid);
        return laneUIDs.length > 0
            ? {laneUIDs, error: null}
            : {laneUIDs: [], error: "lanes-unavailable"};
    }

    return {laneUIDs: [], error: null};
}
