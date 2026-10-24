import {
    buildEventDetailsHref,
    EventLookupError,
    lookupEventByObservationId,
    normalizeEventObservationId,
    resolveEventObservationId,
} from "../../src/lib/data/oscar/EventLookup";
import {withOperationalView} from "../../src/lib/data/oscar/OperationalView";
import {OCCUPANCY_PILLAR_DEF} from "../../src/lib/data/Constants";

function response(status: number, payload: any = {}): Response {
    return {
        status,
        ok: status >= 200 && status < 300,
        json: () => Promise.resolve(payload),
    } as Response;
}

function lane(nodeId: string, laneName: string, dataStreamId: string) {
    const node = {
        id: nodeId,
        name: `Node ${nodeId}`,
        getConnectedSystemsEndpoint: () => `https://${nodeId}.example/sensorhub/api`,
        getBasicAuthHeader: () => ({Authorization: `Basic ${nodeId}`} ),
    };
    return {
        laneName,
        parentNode: node,
        isRS350Backpack: false,
        datastreams: [{
            properties: {
                id: dataStreamId,
                observedProperties: [{definition: OCCUPANCY_PILLAR_DEF}],
            },
        }],
        lookupSystemIdFromDataStreamId: (id: string) => id === dataStreamId ? `${laneName}-rpm` : undefined,
    } as any;
}

function observation(id: string, dataStreamId: string) {
    return {
        id,
        "datastream@id": dataStreamId,
        "foi@id": "foi-1",
        result: {
            occupancyCount: 73,
            startTime: "2026-10-16T12:00:00.000Z",
            endTime: "2026-10-16T12:00:05.000Z",
            maxGamma: 1400,
            maxNeutron: 7,
            neutronBackground: 1,
            gammaAlarm: true,
            neutronAlarm: false,
            adjudicatedIds: [],
            videoPaths: [],
        },
    };
}

describe("event UUID lookup", () => {
    it("normalizes IDs and builds an encoded, operational-view-safe link", () => {
        expect(normalizeEventObservationId("  obs/id  ")).to.equal("obs/id");
        expect(buildEventDetailsHref("obs/id", "node one"))
            .to.equal("/event-details?eventId=obs%2Fid&nodeId=node+one");
        expect(withOperationalView(buildEventDetailsHref("obs/id", "node one"), "north-gate"))
            .to.equal("/event-details?eventId=obs%2Fid&nodeId=node+one&view=north-gate");

        for (const invalidId of ["   ", "x".repeat(129)]) {
            let failure: unknown;
            try {
                normalizeEventObservationId(invalidId);
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("invalid");
        }
    });

    it("targets a requested node and maps the occupancy resource into EventTableData", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const south = lane("south", "Lane 2", "occ-south");
        const laneMap = new Map([[north.laneName, north], [south.laneName, south]]);
        const fetcher = cy.stub().resolves(response(200, observation("obs/id", "occ-south")));

        cy.wrap(lookupEventByObservationId(laneMap, "obs/id", "south", fetcher)).then((result: any) => {
            expect(fetcher).to.have.been.calledOnce;
            expect(fetcher.firstCall.args[0]).to.equal(
                "https://south.example/sensorhub/api/observations/obs%2Fid",
            );
            expect(fetcher.firstCall.args[1]).to.deep.include({credentials: "include"});
            expect(fetcher.firstCall.args[1].headers).to.deep.include({
                Authorization: "Basic south",
                Accept: "application/om+json",
            });
            expect(result.nodeId).to.equal("south");
            expect(result.event.occupancyObsId).to.equal("obs/id");
            expect(result.event.laneId).to.equal("Lane 2");
            expect(result.event.dataStreamId).to.equal("occ-south");
            expect(result.event.rpmSystemId).to.equal("Lane 2-rpm");
            expect(result.event.status).to.equal("Gamma");
        });
    });

    it("probes each visible node and returns the single matching occupancy", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const south = lane("south", "Lane 2", "occ-south");
        const laneMap = new Map([[north.laneName, north], [south.laneName, south]]);
        const fetcher = cy.stub().callsFake((url: string) => Promise.resolve(
            url.includes("north.example")
                ? response(404)
                : response(200, observation("observation-9", "occ-south")),
        ));

        cy.wrap(lookupEventByObservationId(laneMap, "observation-9", null, fetcher)).then((result: any) => {
            expect(fetcher).to.have.been.calledTwice;
            expect(result.nodeId).to.equal("south");
            expect(result.event.laneId).to.equal("Lane 2");
        });
    });

    it("bounds each node request so a hung node cannot stall a valid match", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const south = lane("south", "Lane 2", "occ-south");
        const laneMap = new Map([[north.laneName, north], [south.laneName, south]]);
        const fetcher = cy.stub().callsFake((url: string) => url.includes("north.example")
            ? new Promise<Response>(() => undefined)
            : Promise.resolve(response(200, observation("observation-9", "occ-south"))));

        cy.wrap(lookupEventByObservationId(
            laneMap,
            "observation-9",
            null,
            fetcher,
            undefined,
            10,
        )).then((result: any) => {
            expect(fetcher).to.have.been.calledTwice;
            expect(result.nodeId).to.equal("south");
        });
    });

    it("bounds direct lookup body parsing and aborts an abort-aware body", () => {
        const north = lane("north", "Lane 1", "occ-north");
        let bodyAborted = false;
        const fetcher = cy.stub().callsFake((_url: string, init?: RequestInit) => Promise.resolve({
            status: 200,
            ok: true,
            json: () => new Promise((_resolve, reject) => {
                const handleAbort = () => {
                    bodyAborted = true;
                    reject(new Error("body parsing aborted"));
                };
                init?.signal?.addEventListener("abort", handleAbort, {once: true});
            }),
        } as Response));

        cy.then(async () => {
            let failure: unknown;
            try {
                await lookupEventByObservationId(
                    new Map([[north.laneName, north]]),
                    "observation-9",
                    null,
                    fetcher,
                    undefined,
                    10,
                );
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("unavailable");
            expect(bodyAborted).to.equal(true);
        });
    });

    it("reports an ambiguous ID when more than one visible node resolves it", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const south = lane("south", "Lane 2", "occ-south");
        const laneMap = new Map([[north.laneName, north], [south.laneName, south]]);
        const fetcher = cy.stub().callsFake((url: string) => Promise.resolve(
            response(200, observation(
                "shared-observation-id",
                url.includes("north.example") ? "occ-north" : "occ-south",
            )),
        ));

        cy.then(async () => {
            let failure: unknown;
            try {
                await lookupEventByObservationId(laneMap, "shared-observation-id", null, fetcher);
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("ambiguous");
        });
    });

    it("fails closed when an ID belongs to a non-visible or non-occupancy datastream", () => {
        const north = lane("north", "Lane 1", "visible-occupancy");
        const fetcher = cy.stub().resolves(response(200, observation("hidden-id", "hidden-datastream")));

        cy.then(async () => {
            let failure: unknown;
            try {
                await lookupEventByObservationId(new Map([[north.laneName, north]]), "hidden-id", null, fetcher);
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("not-found");
        });
    });

    it("treats 400, 404, and 410 as not found", () => {
        const north = lane("north", "Lane 1", "occ-north");

        cy.then(async () => {
            for (const status of [400, 404, 410]) {
                let missing: unknown;
                try {
                    await lookupEventByObservationId(
                        new Map([[north.laneName, north]]),
                        "observation-9",
                        null,
                        cy.stub().resolves(response(status)),
                    );
                } catch (error) {
                    missing = error;
                }
                expect(missing).to.be.instanceOf(EventLookupError);
                expect((missing as EventLookupError).code).to.equal("not-found");
            }
        });
    });

    it("preserves authentication, server, and network failures as unavailable", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const failures = [
            cy.stub().resolves(response(401)),
            cy.stub().resolves(response(503)),
            cy.stub().rejects(new Error("network unavailable")),
        ];

        cy.then(async () => {
            for (const fetcher of failures) {
                let unavailable: unknown;
                try {
                    await lookupEventByObservationId(
                        new Map([[north.laneName, north]]),
                        "observation-9",
                        null,
                        fetcher,
                    );
                } catch (error) {
                    unavailable = error;
                }
                expect(unavailable).to.be.instanceOf(EventLookupError);
                expect((unavailable as EventLookupError).code).to.equal("unavailable");
            }
        });
    });

    it("resolves a freshly received realtime event by its exact stream and time range", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const liveEvent = {
            occupancyObsId: null,
            dataStreamId: "occ-north",
            startTime: "2026-10-16T12:00:00.000Z",
            endTime: "2026-10-16T12:00:05.000Z",
        } as any;
        const fetcher = cy.stub().resolves(response(200, {
            items: [observation("persisted-observation-id", "occ-north")],
        }));

        cy.wrap(resolveEventObservationId(liveEvent, north, fetcher)).then((eventId: any) => {
            expect(eventId).to.equal("persisted-observation-id");
            expect(fetcher).to.have.been.calledOnce;

            const requestUrl = new URL(fetcher.firstCall.args[0]);
            expect(`${requestUrl.origin}${requestUrl.pathname}`).to.equal(
                "https://north.example/sensorhub/api/observations",
            );
            expect(requestUrl.searchParams.get("dataStream")).to.equal("occ-north");
            expect(requestUrl.searchParams.get("filter")).to.equal(
                "startTime='2026-10-16T12:00:00.000Z' AND endTime='2026-10-16T12:00:05.000Z'",
            );
            expect(requestUrl.searchParams.get("limit")).to.equal("1");
            expect(fetcher.firstCall.args[1].headers).to.deep.include({
                Authorization: "Basic north",
                Accept: "application/om+json",
            });
        });
    });

    it("classifies transient live-event lookup responses for retry", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const liveEvent = {
            occupancyObsId: null,
            dataStreamId: "occ-north",
            startTime: "2026-10-16T12:00:00.000Z",
            endTime: "2026-10-16T12:00:05.000Z",
        } as any;

        cy.then(async () => {
            for (const [fetcher, expectedCode] of [
                [cy.stub().resolves(response(410)), "not-found"],
                [cy.stub().resolves(response(503)), "unavailable"],
                [cy.stub().rejects(new Error("network unavailable")), "unavailable"],
            ] as const) {
                let failure: unknown;
                try {
                    await resolveEventObservationId(liveEvent, north, fetcher);
                } catch (error) {
                    failure = error;
                }
                expect(failure).to.be.instanceOf(EventLookupError);
                expect((failure as EventLookupError).code).to.equal(expectedCode);
            }
        });
    });

    it("bounds a live-event lookup and classifies its timeout as unavailable", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const liveEvent = {
            occupancyObsId: null,
            dataStreamId: "occ-north",
            startTime: "2026-10-16T12:00:00.000Z",
            endTime: "2026-10-16T12:00:05.000Z",
        } as any;

        cy.then(async () => {
            let failure: unknown;
            try {
                await resolveEventObservationId(
                    liveEvent,
                    north,
                    () => new Promise<Response>(() => undefined),
                    undefined,
                    10,
                );
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("unavailable");
        });
    });

    it("bounds live-event response body parsing even when json ignores abort", () => {
        const north = lane("north", "Lane 1", "occ-north");
        const liveEvent = {
            occupancyObsId: null,
            dataStreamId: "occ-north",
            startTime: "2026-10-16T12:00:00.000Z",
            endTime: "2026-10-16T12:00:05.000Z",
        } as any;
        const fetcher = cy.stub().resolves({
            status: 200,
            ok: true,
            json: () => new Promise(() => undefined),
        } as Response);

        cy.then(async () => {
            let failure: unknown;
            try {
                await resolveEventObservationId(liveEvent, north, fetcher, undefined, 10);
            } catch (error) {
                failure = error;
            }
            expect(failure).to.be.instanceOf(EventLookupError);
            expect((failure as EventLookupError).code).to.equal("unavailable");
        });
    });
});
