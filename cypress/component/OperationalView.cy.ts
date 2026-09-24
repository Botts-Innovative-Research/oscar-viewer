import {
    getOperationalViewKeys,
    parseOperationalView,
    systemMatchesOperationalView,
    withOperationalView,
} from "../../src/lib/data/oscar/OperationalView";
import {Node} from "../../src/lib/data/osh/Node";
import {shouldClearUnavailablePreview} from "../../src/app/_components/dashboard/QuickView";

function geoJsonSystem(id: string, uid: string, name: string) {
    return {
        properties: {
            id,
            properties: {uid, name},
        },
    };
}

describe("operational view scoping", () => {
    const laneSystem = {
        properties: {
            properties: {
                keywords: ["oscar:view:north-gate", "unrelated", "oscar:view:secondary"],
            },
        },
    };

    it("treats an absent view as the unscoped application", () => {
        expect(parseOperationalView("")).to.deep.equal({key: null, error: null});
        expect(systemMatchesOperationalView(laneSystem, null)).to.equal(true);
    });

    it("accepts valid workstation keys and matches SensorML keywords", () => {
        expect(parseOperationalView("?view=north-gate")).to.deep.equal({key: "north-gate", error: null});
        expect(getOperationalViewKeys(laneSystem)).to.deep.equal(["north-gate", "secondary"]);
        expect(systemMatchesOperationalView(laneSystem, "north-gate")).to.equal(true);
        expect(systemMatchesOperationalView(laneSystem, "south-gate")).to.equal(false);
    });

    it("fails closed for empty, uppercase, and malformed keys", () => {
        ["?view=", "?view=North", "?view=-north", "?view=north_1", "?view=north&view=south"].forEach((search) => {
            expect(parseOperationalView(search)).to.deep.equal({key: null, error: "invalid"});
        });
    });

    it("preserves the scope on internal links", () => {
        expect(withOperationalView("/event-details?eventId=42", "north-gate"))
            .to.equal("/event-details?eventId=42&view=north-gate");
        expect(withOperationalView("/event-log", "")).to.equal("/event-log?view=");
        expect(withOperationalView("/event-log", null)).to.equal("/event-log");
    });

    it("clears a persisted preview only after its lane is known to be unavailable", () => {
        const preview = {isOpen: true, eventData: {laneId: "lane37"}};

        expect(shouldClearUnavailablePreview(preview, false, new Set(["lane1", "lane24"])))
            .to.equal(false);
        expect(shouldClearUnavailablePreview(preview, true, new Set(["lane1", "lane24"])))
            .to.equal(true);
        expect(shouldClearUnavailablePreview(
            {isOpen: true, eventData: {laneId: "lane1"}},
            true,
            new Set(["lane1", "lane24"]),
        )).to.equal(false);
    });

    it("loads SensorML keywords before filtering GeoJSON lane systems", async () => {
        const northLane = geoJsonSystem("north-id", "urn:osh:system:lane:lane1", "lane1");
        const southLane = geoJsonSystem("south-id", "urn:osh:system:lane:lane2", "lane2");
        const node: any = Object.create(Node.prototype);

        node.checkForEndpoint = cy.stub().resolves(true);
        node.fetchSystems = cy.stub().resolves([northLane, southLane]);
        node.systemsApi = {
            getSystemById: cy.stub().callsFake((id: string, filter: any) => {
                expect(filter.props.format).to.equal("application/sml+json");
                return Promise.resolve({
                    properties: {
                        keywords: [`oscar:view:${id === "north-id" ? "north-gate" : "south-gate"}`],
                    },
                });
            }),
        };

        const lanes = await node.fetchLaneSystemsAndSubsystems("north-gate");

        expect(node.systemsApi.getSystemById).to.have.been.calledTwice;
        expect(lanes.size).to.equal(1);
        expect(lanes.has("lane1")).to.equal(true);
        expect(lanes.has("lane2")).to.equal(false);
        expect(northLane.properties.properties.keywords).to.deep.equal(["oscar:view:north-gate"]);
    });

    it("does not request SensorML descriptions for the default unscoped view", async () => {
        const lane = geoJsonSystem("lane-id", "urn:osh:system:lane:lane1", "lane1");
        const node: any = Object.create(Node.prototype);

        node.checkForEndpoint = cy.stub().resolves(true);
        node.fetchSystems = cy.stub().resolves([lane]);
        node.systemsApi = {getSystemById: cy.stub().resolves({})};

        const lanes = await node.fetchLaneSystemsAndSubsystems();

        expect(node.systemsApi.getSystemById).not.to.have.been.called;
        expect(lanes.has("lane1")).to.equal(true);
    });

    it("excludes a lane when its SensorML assignment cannot be verified", async () => {
        const lane: any = geoJsonSystem("lane-id", "urn:osh:system:lane:lane1", "lane1");
        const node: any = Object.create(Node.prototype);
        const warn = cy.stub(console, "warn");

        lane.properties.properties.keywords = ["oscar:view:north-gate"];
        node.checkForEndpoint = cy.stub().resolves(true);
        node.fetchSystems = cy.stub().resolves([lane]);
        node.systemsApi = {getSystemById: cy.stub().rejects(new Error("metadata unavailable"))};

        const lanes = await node.fetchLaneSystemsAndSubsystems("north-gate");

        expect(lanes.size).to.equal(0);
        expect(lane.properties.properties.keywords).to.deep.equal([]);
        expect(warn).to.have.been.called;
    });
});
