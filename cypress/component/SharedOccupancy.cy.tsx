import React, {useState} from "react";
import {loadSharedOccupancy, occupancyDetailsPath, resolveOccupancyId} from "../../src/lib/data/oscar/SharedOccupancy";
import {useSharedOccupancy} from "../../src/app/hooks/useSharedOccupancy";
import ShareOccupancyButton from "../../src/app/_components/event-details/ShareOccupancyButton";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import {OCCUPANCY_PILLAR_DEF} from "../../src/lib/data/Constants";

const origin = "https://node.example/sensorhub/api";
function fixtures() {
    const node: any = {name: "Node", getConnectedSystemsEndpoint: () => origin, getBasicAuthHeader: () => ({})};
    const stream: any = {properties: {id: "stream", "system@id": "rpm", observedProperties: [{definition: OCCUPANCY_PILLAR_DEF}]}};
    const lane: any = {parentNode: node, datastreams: [stream], isRS350Backpack: false,
        laneSystem: {properties: {id: "lane-system"}}};
    const lanes: any = new Map([["Lane 1", lane]]);
    const result = {occupancyCount: 37, startTime: "2026-10-25T01:00:00.000Z", endTime: "2026-10-25T01:00:01.000Z",
        gammaAlarm: false, neutronAlarm: false, videoPaths: ["video.mp4"], adjudicatedIds: ["adjudication"]};
    const observation = {id: "obs-37", "datastream@id": "stream", "foi@id": "vehicle", result};
    const event: any = {...result, id: 37, laneId: "Lane 1", occupancyObsId: "obs-37"};
    return {node, stream, lane, lanes, result, observation, event};
}

function Harness({nodes, lanes, ready = true}: any) {
    const [id, setId] = useState("obs-37");
    const shared = useSharedOccupancy(id, origin, nodes, lanes, ready);
    return <>
        <span data-cy="event">{shared.event?.occupancyObsId ?? ""}</span>
        <span data-cy="error">{shared.error ?? ""}</span>
        <span data-cy="loading">{String(shared.loading)}</span>
        <button onClick={() => setId("other")}>Switch</button>
        <button onClick={shared.retry}>Retry</button>
    </>;
}

describe("shared occupancies", () => {
    beforeEach(() => localStorage.setItem("language", "en"));

    it("creates an encoded static page URL with a stable node endpoint and no credentials", () => {
        const {node} = fixtures();
        const url = new URL(occupancyDetailsPath("obs/&?=", node), "https://viewer.example");
        expect(url.pathname).to.equal("/event-details/");
        expect(url.searchParams.get("id")).to.equal("obs/&?=");
        expect(url.searchParams.get("node")).to.equal(origin);
        expect([...url.searchParams.keys()]).to.deep.equal(["id", "node"]);
    });

    it("loads a non-alarm occupancy directly with its lane, media, and adjudication references", () => {
        const {node, lanes, observation} = fixtures();
        cy.intercept("GET", `${origin}/observations/obs-37`, observation).as("observation");
        cy.then(() => loadSharedOccupancy("obs-37", origin, [node], lanes)).then(event => {
            expect(event.status).to.equal("None");
            expect(event.laneId).to.equal("Lane 1");
            expect(event.occupancyObsId).to.equal("obs-37");
            expect(event.rpmSystemId).to.equal("rpm");
            expect(event.dataStreamId).to.equal("stream");
            expect(event.foiId).to.equal("vehicle");
            expect(event.videoPaths).to.deep.equal(["video.mp4"]);
            expect(event.adjudicatedIds).to.deep.equal(["adjudication"]);
        });
    });

    for (const [statusCode, error] of [[404, "sharedOccupancyNotFound"], [401, "sharedOccupancyAccessDenied"],
        [403, "sharedOccupancyAccessDenied"], [500, "sharedOccupancyLoadFailed"]] as const) {
        it(`handles HTTP ${statusCode} without showing a previous occupancy`, () => {
            const {node, lanes} = fixtures();
            cy.intercept("GET", `${origin}/observations/*`, {statusCode});
            cy.mount(<Harness nodes={[node]} lanes={lanes}/>);
            cy.get('[data-cy="error"]').should("have.text", error);
            cy.get('[data-cy="event"]').should("be.empty");
        });
    }

    it("does not fetch an arbitrary node supplied in a URL", () => {
        const {node, lanes} = fixtures();
        cy.wrap(loadSharedOccupancy("obs-37", "https://unknown.example/api", [node], lanes)
            .catch(error => error.translationKey)).should("equal", "sharedOccupancyNodeUnavailable");
    });

    it("rejects observations from a non-occupancy stream", () => {
        const {node, lanes, observation} = fixtures();
        cy.intercept("GET", `${origin}/observations/*`, {...observation, "datastream@id": "gamma-stream"});
        cy.mount(<Harness nodes={[node]} lanes={lanes}/>);
        cy.get('[data-cy="error"]').should("have.text", "sharedOccupancyLaneUnavailable");
    });

    it("supports ID-only links but rejects ambiguous IDs across nodes", () => {
        const {node, lane, lanes, observation} = fixtures();
        const second: any = {...node, getConnectedSystemsEndpoint: () => "https://second.example/api"};
        lanes.set("Lane 2", {...lane, parentNode: second});
        cy.intercept("GET", `${origin}/observations/*`, observation);
        cy.intercept("GET", "https://second.example/api/observations/*", observation);
        cy.then(() => loadSharedOccupancy("obs-37", null, [node], lanes)).its("occupancyObsId").should("equal", "obs-37");
        cy.then(() => loadSharedOccupancy("obs-37", null, [node, second], lanes)
            .catch(error => error.translationKey)).should("equal", "sharedOccupancyAmbiguous");
    });

    it("waits for discovery and ignores an old request when switching links", () => {
        const {node, lanes, observation} = fixtures();
        cy.intercept("GET", `${origin}/observations/obs-37`, {delay: 500, body: observation});
        cy.intercept("GET", `${origin}/observations/other`, {...observation, id: "other"});
        cy.mount(<Harness nodes={[node]} lanes={lanes}/>);
        cy.get('[data-cy="loading"]').should("have.text", "true");
        cy.contains("button", "Switch").click();
        cy.get('[data-cy="event"]').should("have.text", "other");
        cy.wait(600);
        cy.get('[data-cy="event"]').should("have.text", "other");
    });

    it("does not request observations until lanes are ready", () => {
        const {node, lanes} = fixtures();
        cy.mount(<Harness nodes={[node]} lanes={lanes} ready={false}/>);
        cy.get('[data-cy="loading"]').should("have.text", "true");
        cy.get('[data-cy="event"]').should("be.empty");
    });

    it("retries failed loads", () => {
        const {node, lanes, observation} = fixtures();
        cy.intercept("GET", `${origin}/observations/*`, {statusCode: 500});
        cy.mount(<Harness nodes={[node]} lanes={lanes}/>);
        cy.get('[data-cy="error"]').should("not.be.empty");
        cy.intercept("GET", `${origin}/observations/*`, observation);
        cy.contains("button", "Retry").click();
        cy.get('[data-cy="event"]').should("have.text", "obs-37");
    });

    it("resolves the stored ID for a live occupancy without mutating Redux data", () => {
        const {event, lane, stream, observation} = fixtures();
        event.occupancyObsId = null;
        Object.freeze(event);
        stream.searchObservations = cy.stub().resolves({nextPage: async () => [{properties: observation}]});
        cy.wrap(resolveOccupancyId(event, lane)).should("equal", "obs-37");
    });

    it("offers retry when a live occupancy has not yet been stored", () => {
        const {event, lane, stream} = fixtures();
        event.occupancyObsId = null;
        stream.searchObservations = cy.stub().resolves({nextPage: async () => []});
        cy.mount(<LanguageProvider><ShareOccupancyButton event={event} lane={lane}/></LanguageProvider>);
        cy.contains("button", "Share occupancy").click();
        cy.contains("not yet available as a stored observation").should("be.visible");
        cy.contains("button", "Retry").should("be.visible");
    });

    it("shows and copies a link; keeps it selectable when clipboard access fails", () => {
        const {event, lane} = fixtures();
        cy.mount(<LanguageProvider><ShareOccupancyButton event={event} lane={lane}/></LanguageProvider>);
        cy.window().then(window => {
            cy.stub(window.navigator.clipboard, "writeText").rejects(new Error("denied")).as("copy");
        });
        cy.contains("button", "Share occupancy").click();
        cy.get('input').invoke("val").should("contain", "id=obs-37");
        cy.contains("button", "Copy link").click();
        cy.contains("Select and copy the link above").should("be.visible");
        cy.get('input').should("be.visible");
        cy.get("@copy").should("have.been.calledOnce");
    });
});
