import {waitForAdjudicationLogSource} from "../../src/app/_components/adjudication/AdjudicationLog";
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
});
