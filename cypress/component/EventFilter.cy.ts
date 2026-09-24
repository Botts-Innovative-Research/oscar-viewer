import {
    combineServerFilters,
    compileEventFilterForLane,
    createEventFilterRule,
    EventFilterGroup,
    eventMatchesFilter,
    operatorsForEventFilterField,
} from "../../src/lib/data/oscar/EventFilter";
import {runWithConcurrency} from "../../src/lib/data/oscar/BulkAdjudication";
import {
    buildObservationCountParams,
    buildObservationPageParams,
} from "../../src/lib/data/oscar/EventQuery";

describe("nested event filters", () => {
    it("uses inclusive comparisons as the primary controls for numeric event fields", () => {
        (["occupancyCount", "maxGamma", "maxNeutron"] as const).forEach(field => {
            expect(operatorsForEventFilterField(field).slice(0, 2)).to.deep.equal([
                "greaterThanOrEqual",
                "lessThanOrEqual",
            ]);
            expect(createEventFilterRule(field).operator).to.equal("greaterThanOrEqual");
        });
    });

    it("compiles inclusive numeric boundaries for occupancy, gamma, and neutron values", () => {
        const filter: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "occupancy", field: "occupancyCount", operator: "greaterThanOrEqual", value: "3400"},
                {kind: "rule", id: "gamma", field: "maxGamma", operator: "lessThanOrEqual", value: "1800"},
                {kind: "rule", id: "neutron", field: "maxNeutron", operator: "greaterThanOrEqual", value: "12"},
            ],
        };

        const compiled = compileEventFilterForLane(filter, {nodeId: "node-1", nodeName: "Local", laneId: "lane1"});
        expect(compiled).to.contain("occupancyCount>=3400");
        expect(compiled).to.contain("maxGamma<=1800");
        expect(compiled).to.contain("maxNeutron>=12");

        const event = {occupancyCount: "3400", maxGamma: 1800, maxNeutron: 12} as any;
        expect(eventMatchesFilter(filter, event, {nodeId: "node-1", nodeName: "Local", laneId: "lane1"})).to.equal(true);
    });

    it("preserves nested AND/OR rules while collapsing lane metadata", () => {
        const filter: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "lane", field: "laneId", operator: "isAnyOf", value: ["lane1", "lane2"]},
                {
                    kind: "group",
                    id: "alarm",
                    logic: "or",
                    children: [
                        {kind: "rule", id: "gamma", field: "maxGamma", operator: "greaterThan", value: "1500"},
                        {kind: "rule", id: "neutron", field: "status", operator: "equals", value: "Neutron"},
                    ],
                },
            ],
        };

        const laneOne = compileEventFilterForLane(filter, {nodeId: "node-1", nodeName: "Local", laneId: "lane1"});
        expect(laneOne).to.contain("maxGamma>1500");
        expect(laneOne).to.contain("neutronAlarm=true");
        expect(compileEventFilterForLane(filter, {nodeId: "node-1", nodeName: "Local", laneId: "lane3"})).to.equal(false);
    });

    it("allows a metadata branch to satisfy an OR group without a server result predicate", () => {
        const filter: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "or",
            children: [
                {kind: "rule", id: "lane", field: "laneId", operator: "equals", value: "lane1"},
                {kind: "rule", id: "gamma", field: "maxGamma", operator: "greaterThan", value: "2000"},
            ],
        };

        expect(compileEventFilterForLane(filter, {nodeId: "node-1", nodeName: "Local", laneId: "lane1"})).to.equal(null);
        expect(compileEventFilterForLane(filter, {nodeId: "node-1", nodeName: "Local", laneId: "lane2"})).to.equal("maxGamma>2000");
    });

    it("uses the same nested semantics for live events", () => {
        const filter: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "node", field: "node", operator: "equals", value: "Local"},
                {kind: "rule", id: "gamma", field: "maxGamma", operator: "between", value: "1200", value2: "1800"},
            ],
        };
        const event = {maxGamma: 1500, status: "Gamma", adjudicatedIds: []} as any;
        expect(eventMatchesFilter(filter, event, {nodeId: "node-1", nodeName: "Local", laneId: "lane1"})).to.equal(true);
        expect(eventMatchesFilter(filter, event, {nodeId: "node-2", nodeName: "Remote", laneId: "lane1"})).to.equal(false);
    });

    it("maps adjudicated label and presence operators to the backend count field", () => {
        expect(operatorsForEventFilterField("adjudicatedIds")).to.include.members([
            "contains",
            "isEmpty",
            "isNotEmpty",
        ]);

        const containsYes: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "adjudicated", field: "adjudicatedIds", operator: "contains", value: "yes"},
            ],
        };
        const isNotEmpty: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "adjudicated", field: "adjudicatedIds", operator: "isNotEmpty", value: ""},
            ],
        };
        const isEmpty: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "adjudicated", field: "adjudicatedIds", operator: "isEmpty", value: ""},
            ],
        };
        const metadata = {nodeId: "node-1", nodeName: "Local", laneId: "lane1"};
        const adjudicatedEvent = {adjudicatedIds: ["result-1"]} as any;
        const unadjudicatedEvent = {adjudicatedIds: []} as any;

        expect(compileEventFilterForLane(containsYes, metadata)).to.equal("adjudicatedIdsCount>0");
        expect(compileEventFilterForLane(isNotEmpty, metadata)).to.equal("adjudicatedIdsCount>0");
        expect(compileEventFilterForLane(isEmpty, metadata)).to.equal("adjudicatedIdsCount=0");
        expect(eventMatchesFilter(containsYes, adjudicatedEvent, metadata)).to.equal(true);
        expect(eventMatchesFilter(containsYes, unadjudicatedEvent, metadata)).to.equal(false);
        expect(eventMatchesFilter(isNotEmpty, adjudicatedEvent, metadata)).to.equal(true);
        expect(eventMatchesFilter(isNotEmpty, unadjudicatedEvent, metadata)).to.equal(false);
        expect(eventMatchesFilter(isEmpty, adjudicatedEvent, metadata)).to.equal(false);
        expect(eventMatchesFilter(isEmpty, unadjudicatedEvent, metadata)).to.equal(true);
    });

    it("sends the same complete database filter to counts and every result page", () => {
        const gammaAndNeutron: EventFilterGroup = {
            kind: "group",
            id: "root",
            logic: "and",
            children: [
                {kind: "rule", id: "status", field: "status", operator: "equals", value: "Gamma & Neutron"},
            ],
        };
        const compiled = compileEventFilterForLane(gammaAndNeutron, {
            nodeId: "node-1",
            nodeName: "Local",
            laneId: "lane1",
        });
        const plan = {
            datastreamIds: ["occupancy-1", "occupancy-2"],
            filter: combineServerFilters(
                "(gammaAlarm=true OR neutronAlarm=true) AND adjudicatedIdsCount=0",
                compiled || "",
            ),
        };
        const cutoff = "2026-09-24T12:00:00.000Z";
        const firstPage = buildObservationPageParams(plan, cutoff, 15, 0);
        const secondPage = buildObservationPageParams(plan, cutoff, 15, 15);
        const count = buildObservationCountParams(plan, cutoff);

        expect(firstPage.get("filter")).to.equal(plan.filter);
        expect(secondPage.get("filter")).to.equal(plan.filter);
        expect(count.get("filter")).to.equal(plan.filter);
        expect(firstPage.get("offset")).to.equal("0");
        expect(secondPage.get("offset")).to.equal("15");
        expect(secondPage.get("limit")).to.equal("15");
        expect(secondPage.get("dataStream")).to.equal("occupancy-1,occupancy-2");
        expect(secondPage.get("filter")).to.contain("gammaAlarm=true AND neutronAlarm=true");
        expect(secondPage.get("filter")).to.contain("adjudicatedIdsCount=0");
        expect(secondPage.toString()).to.contain("filter=");
    });
});

describe("bounded bulk work", () => {
    it("never exceeds the configured concurrency and preserves result order", async () => {
        let active = 0;
        let peak = 0;
        const results = await runWithConcurrency([0, 1, 2, 3, 4, 5, 6, 7], 3, async value => {
            active += 1;
            peak = Math.max(peak, active);
            await new Promise(resolve => setTimeout(resolve, 5));
            active -= 1;
            return value * 2;
        });

        expect(peak).to.equal(3);
        expect(results).to.deep.equal([0, 2, 4, 6, 8, 10, 12, 14]);
    });
});
