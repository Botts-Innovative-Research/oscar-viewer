import {
    compileEventFilterForLane,
    createEventFilterRule,
    EventFilterGroup,
    eventMatchesFilter,
    operatorsForEventFilterField,
} from "../../src/lib/data/oscar/EventFilter";
import {runWithConcurrency} from "../../src/lib/data/oscar/BulkAdjudication";

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
