export interface ObservationQueryPlan {
    datastreamIds: string[];
    filter: string;
}

const baseObservationParams = (plan: ObservationQueryPlan, cutoff: string): URLSearchParams => {
    const params = new URLSearchParams({
        resultTime: `../${cutoff}`,
        format: "application/om+json",
        dataStream: plan.datastreamIds.join(","),
    });
    if (plan.filter) params.set("filter", plan.filter);
    return params;
};

export const buildObservationPageParams = (
    plan: ObservationQueryPlan,
    cutoff: string,
    limit: number,
    offset: number,
): URLSearchParams => {
    const params = baseObservationParams(plan, cutoff);
    params.set("order", "desc");
    params.set("offset", String(offset));
    params.set("limit", String(limit));
    return params;
};

export const buildObservationCountParams = (
    plan: ObservationQueryPlan,
    cutoff: string,
): URLSearchParams => baseObservationParams(plan, cutoff);
