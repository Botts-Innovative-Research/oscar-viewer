import {
    removeRealtimeEventSubscription,
    resolveRealtimeEventForNotification,
} from "../../src/app/_components/event-table/EventTable";
import {NotificationTemplates} from "../../src/app/_components/notifications/NotificationService";
import {EventLookupError} from "../../src/lib/data/oscar/EventLookup";

function realtimeEvent() {
    return {
        id: 17,
        laneId: "Lane 1",
        occupancyCount: "42",
        occupancyObsId: null,
        startTime: "2026-10-16T12:00:00.000Z",
        endTime: "2026-10-16T12:00:05.000Z",
        status: "Gamma",
        adjudicatedIds: [],
        parentNode: "Local Node",
    } as any;
}

const lane = {parentNode: {id: "node-1"}} as any;
const labels = {title: "Gamma alarm", body: "Lane 1", viewAlarm: "View", events: "Events", dismiss: "Dismiss"};

interface ServiceWorkerHarness {
    click: (data: any, action?: string) => Promise<void>;
    openWindow: Cypress.Agent<sinon.SinonStub>;
    focus: Cypress.Agent<sinon.SinonStub>;
    postMessage: Cypress.Agent<sinon.SinonStub>;
    navigate: Cypress.Agent<sinon.SinonStub>;
}

function serviceWorkerHarness(
    source: string,
    openClientUrl?: string,
    navigationAvailable = true,
): ServiceWorkerHarness {
    const handlers: Record<string, (event: any) => void> = {};
    const openWindow = cy.stub().resolves();
    const focus = cy.stub().resolves();
    const postMessage = cy.stub();
    const navigate = cy.stub().callsFake((url: string) => Promise.resolve({url, focus, postMessage}));
    const client = openClientUrl ? {
        url: openClientUrl,
        focus,
        postMessage,
        ...(navigationAvailable ? {navigate} : {}),
    } : null;
    const clients = {
        claim: cy.stub().resolves(),
        matchAll: cy.stub().resolves(client ? [client] : []),
        openWindow,
    };
    const worker = {
        location: {origin: "https://oscar.local"},
        skipWaiting: cy.stub(),
        registration: {showNotification: cy.stub().resolves()},
        clients,
        addEventListener: (name: string, handler: (event: any) => void) => {
            handlers[name] = handler;
        },
    };

    // Execute the shipped worker, not a copy of its routing logic.
    new Function("self", "clients", source)(worker, clients);

    return {
        openWindow,
        focus,
        postMessage,
        navigate,
        click: (data: any, action = "") => new Promise<void>((resolve, reject) => {
            let completion: Promise<unknown> | undefined;
            handlers.notificationclick({
                action,
                notification: {data, close: cy.stub()},
                waitUntil: (promise: Promise<unknown>) => { completion = promise; },
            });
            if (!completion) {
                reject(new Error("notificationclick did not register asynchronous work"));
                return;
            }
            completion.then(() => resolve(), reject);
        }),
    };
}

describe("realtime alarm notification identity", () => {
    it("removes stale handlers from the wrapped OSH realtime datasource", () => {
        const active = cy.stub();
        const stale = cy.stub();
        const listeners = [active, stale, stale];
        const source = {
            timeSeriesDataSource: {
                eventSubscriptionMap: {data: listeners},
            },
        };

        removeRealtimeEventSubscription(source, stale, "data");

        expect(listeners).to.deep.equal([active]);
    });

    it("retries persistence lag and emits a canonical deep-link identity immutably", () => {
        const original = realtimeEvent();
        const immediate = NotificationTemplates.newAlarm(original, labels, "north", "node-1");
        expect(immediate.actions?.[0]).to.deep.equal({action: "view-events", title: "Events"});
        expect(immediate.data.eventId).to.equal(undefined);

        const resolver = cy.stub();
        resolver.onFirstCall().rejects(new EventLookupError("not-found", "not ready"));
        resolver.onSecondCall().rejects(new EventLookupError("unavailable", "replica lag"));
        resolver.onThirdCall().resolves("persisted-observation-id");

        cy.wrap(resolveRealtimeEventForNotification(
            original,
            lane,
            undefined,
            resolver,
            [0, 0],
        )).then((resolved: any) => {
            expect(resolver).to.have.callCount(3);
            expect(resolved).not.to.equal(original);
            expect(original.occupancyObsId).to.equal(null);
            expect(resolved.occupancyObsId).to.equal("persisted-observation-id");

            const notification = NotificationTemplates.newAlarm(resolved, labels, "north", "node-1");
            expect(notification.actions?.[0]).to.deep.equal({action: "view-alarm", title: "View"});
            expect(notification.data.eventId).to.equal("persisted-observation-id");
            expect(notification.data.nodeId).to.equal("node-1");
            expect(notification.data.viewKey).to.equal("north");
            expect(notification.data.eventData.occupancyObsId).to.equal("persisted-observation-id");
            expect(notification.tag).to.equal(immediate.tag);

            const differentAlarm = NotificationTemplates.newAlarm(
                {...original, id: 18},
                labels,
                "north",
                "node-1",
            );
            expect(differentAlarm.tag).not.to.equal(immediate.tag);
        });
    });

    it("returns the original event after bounded failures so fallback notification is retained", () => {
        const original = realtimeEvent();
        const resolver = cy.stub().rejects(new EventLookupError("not-found", "not ready"));

        cy.wrap(resolveRealtimeEventForNotification(
            original,
            lane,
            undefined,
            resolver,
            [0, 0],
        )).then((fallback: any) => {
            expect(resolver).to.have.callCount(3);
            expect(fallback).to.equal(original);

            const notification = NotificationTemplates.newAlarm(fallback, labels, "north", "node-1");
            expect(notification.data.eventId).to.equal(undefined);
            expect(notification.actions?.[0]).to.deep.equal({action: "view-events", title: "Events"});
            expect(notification.data.eventData).to.deep.include({laneId: "Lane 1", occupancyCount: "42"});
        });
    });

    it("routes cold notification clicks to canonical details or scoped Events using the shipped worker", () => {
        cy.readFile("public/sw.js", "utf8").then((source: string) => {
            const direct = serviceWorkerHarness(source);
            return cy.wrap(direct.click({
                eventId: "obs/id",
                nodeId: "node one",
                viewKey: "north",
                eventData: {laneId: "Lane 1"},
            })).then(() => {
                expect(direct.openWindow).to.have.been.calledOnceWithExactly(
                    "https://oscar.local/event-details?eventId=obs%2Fid&nodeId=node+one&view=north",
                );

                const fallback = serviceWorkerHarness(source);
                return cy.wrap(fallback.click({viewKey: "north", eventData: {laneId: "Lane 1"}}, "view-events"))
                    .then(() => {
                        expect(fallback.openWindow).to.have.been.calledOnceWithExactly(
                            "https://oscar.local/event-log?view=north",
                        );
                    });
            });
        });
    });

    it("navigates a matching open Viewer to the resolved or fallback destination", () => {
        cy.readFile("public/sw.js", "utf8").then((source: string) => {
            const direct = serviceWorkerHarness(source, "https://oscar.local/health?view=north");
            return cy.wrap(direct.click({
                eventId: "observation-17",
                nodeId: "node-1",
                viewKey: "north",
                eventData: {laneId: "Lane 1"},
            }, "view-alarm")).then(() => {
                expect(direct.navigate).to.have.been.calledOnceWithExactly(
                    "https://oscar.local/event-details?eventId=observation-17&nodeId=node-1&view=north",
                );
                expect(direct.focus).to.have.been.calledOnce;
                expect(direct.postMessage).not.to.have.been.called;
                expect(direct.openWindow).not.to.have.been.called;

                const fallback = serviceWorkerHarness(source, "https://oscar.local/event-details?view=north");
                return cy.wrap(fallback.click({viewKey: "north"}, "view-events")).then(() => {
                    expect(fallback.navigate).to.have.been.calledOnceWithExactly(
                        "https://oscar.local/event-log?view=north",
                    );
                    expect(fallback.focus).to.have.been.calledOnce;
                    expect(fallback.postMessage).not.to.have.been.called;
                    expect(fallback.openWindow).not.to.have.been.called;
                });
            });
        });
    });

    it("retains the message fallback when WindowClient navigation is unavailable", () => {
        cy.readFile("public/sw.js", "utf8").then((source: string) => {
            const harness = serviceWorkerHarness(
                source,
                "https://oscar.local/event-log?view=north",
                false,
            );
            return cy.wrap(harness.click({viewKey: "north"}, "view-events")).then(() => {
                expect(harness.focus).to.have.been.calledOnce;
                expect(harness.postMessage).to.have.been.calledOnceWithExactly({type: "VIEW_EVENTS"});
                expect(harness.openWindow).not.to.have.been.called;
            });
        });
    });

    it("does not let login or SensorHub Admin tabs swallow a notification click", () => {
        cy.readFile("public/sw.js", "utf8").then((source: string) => {
            const login = serviceWorkerHarness(source, "https://oscar.local/login?view=north");
            return cy.wrap(login.click({
                eventId: "observation-17",
                nodeId: "node-1",
                viewKey: "north",
            }, "view-alarm")).then(() => {
                expect(login.navigate).not.to.have.been.called;
                expect(login.focus).not.to.have.been.called;
                expect(login.postMessage).not.to.have.been.called;
                expect(login.openWindow).to.have.been.calledOnceWithExactly(
                    "https://oscar.local/event-details?eventId=observation-17&nodeId=node-1&view=north",
                );

                const admin = serviceWorkerHarness(source, "https://oscar.local/sensorhub/admin?view=north");
                return cy.wrap(admin.click({viewKey: "north"}, "view-events")).then(() => {
                    expect(admin.navigate).not.to.have.been.called;
                    expect(admin.focus).not.to.have.been.called;
                    expect(admin.postMessage).not.to.have.been.called;
                    expect(admin.openWindow).to.have.been.calledOnceWithExactly(
                        "https://oscar.local/event-log?view=north",
                    );
                });
            });
        });
    });
});
