import {
    mergeAdjudicationLogs,
    waitForAdjudicationLogSource,
} from "../../src/app/_components/adjudication/AdjudicationLog";
import AdjudicationData from "../../src/lib/data/oscar/adjudication/Adjudication";
import {AdjudicationCodes} from "../../src/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {ADJ_DEF} from "../../src/lib/data/Constants";

describe("adjudication log source discovery", () => {
    it("waits for the lane map to hydrate after an Event Details reload", () => {
        const stream = {
            properties: {
                id: "adjudication-control",
                name: "Adjudication Control",
                "system@id": "lane-system-id",
                controlledProperties: [{definition: ADJ_DEF}],
            },
        } as any;
        const lane = {
            controlStreams: [stream],
            systems: [],
            parentNode: {fetchNodeControlStreams: cy.stub().resolves([])},
        } as any;
        const laneMapRef = {current: new Map<string, any>()};

        const sourcePromise = waitForAdjudicationLogSource(
            laneMapRef,
            "Lane50",
            {attempts: 10, delayMs: 5},
        );
        setTimeout(() => laneMapRef.current.set("Lane50", lane), 10);

        cy.wrap(sourcePromise).then((source) => {
            expect(source?.lane).to.equal(lane);
            expect(source?.controlStream).to.equal(stream);
        });
    });

    it("falls back to node control-stream discovery while lane controls hydrate", () => {
        const stream = {
            properties: {
                id: "adjudication-control",
                name: "Adjudication Control",
                "system@id": "lane-system-id",
                controlledProperties: [{definition: ADJ_DEF}],
            },
        } as any;
        const lane = {
            controlStreams: [],
            systems: [{properties: {id: "lane-system-id"}}],
            parentNode: {fetchNodeControlStreams: cy.stub().resolves([stream])},
        } as any;
        const laneMapRef = {current: new Map([["Lane50", lane]])};

        cy.wrap(waitForAdjudicationLogSource(
            laneMapRef,
            "Lane50",
            {attempts: 2, delayMs: 1},
        )).then((source) => {
            expect(source?.lane).to.equal(lane);
            expect(source?.controlStream).to.equal(stream);
            expect(lane.parentNode.fetchNodeControlStreams).to.have.been.calledOnce;
        });
    });

    it("deduplicates concurrent WebSocket and REST adjudication log entries", () => {
        const makeEntry = (id: string, feedback: string) => {
            const entry = new AdjudicationData("2026-04-20T21:44:22.400865Z", "44", "0jd46");
            entry.id = id;
            entry.setAdjudicationCode(AdjudicationCodes.getCodeObjByIndex(2));
            entry.setFeedback(feedback);
            entry.setIsotopes(["Neutron"]);
            entry.setSecondaryInspectionStatus("COMPLETED");
            entry.setVehicleId("SH453");
            entry.setUser("admin");
            return entry;
        };

        const wsEntry = makeEntry("ws-uuid", "Initial note");
        const restDuplicate = makeEntry("0hhg", "Initial note");
        const distinctSecond = makeEntry("0hhi", "Follow-up note");

        const merged = mergeAdjudicationLogs([wsEntry], [restDuplicate, distinctSecond]);
        expect(merged).to.have.length(2);
        expect(merged[0].id).to.equal("ws-uuid");
        expect(merged[0].feedback).to.equal("Initial note");
        expect(merged[1].id).to.equal("0hhi");
        expect(merged[1].feedback).to.equal("Follow-up note");
    });
});
