import React from "react";
import {configureStore} from "@reduxjs/toolkit";
import {Provider} from "react-redux";
import HealthPage from "../../src/app/health/page";
import {DataSourceContext} from "../../src/app/contexts/DataSourceContext";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import laneReducer, {setLaneMap} from "../../src/lib/state/OSCARLaneSlice";
import {manageSharedConnection} from "../../src/lib/data/oscar/LaneCollection";
import {
    ALARM_DEF,
    CONNECTION_DEF,
    GAMMA_COUNT_DEF,
    NEUTRON_COUNT_DEF,
    OCCUPANCY_STATUS_DEF,
    RASTER_IMAGE_DEF,
    TAMPER_STATUS_DEF,
} from "../../src/lib/data/Constants";

interface FakeSource {
    properties: {resource: string};
    eventSubscriptionMap: Record<string, Array<(message: any) => void>>;
    subscribe: any;
    connect: any;
    disconnect: any;
    emit: (result: any) => void;
    listenerCount: () => number;
}

interface FakeNode {
    id: string;
    name: string;
    searchObservations: any;
    getObservationsApi: () => {searchObservations: any};
}

function dataSource(streamId: string, connectGate: Promise<void> = Promise.resolve()): FakeSource {
    const eventSubscriptionMap: Record<string, Array<(message: any) => void>> = {};
    let connected = false;
    return {
        properties: {resource: `/datastreams/${streamId}/observations`},
        eventSubscriptionMap,
        subscribe: cy.stub().callsFake((handler: (message: any) => void, eventTypes: string[]) => {
            eventTypes.forEach((eventType) => {
                eventSubscriptionMap[eventType] ??= [];
                eventSubscriptionMap[eventType].push(handler);
            });
        }),
        connect: cy.stub().callsFake(() => connectGate.then(() => {
            connected = true;
        })),
        disconnect: cy.stub().callsFake(() => {
            connected = false;
            return Promise.resolve();
        }),
        emit: (result: any) => {
            if (!connected) return;
            Object.entries(eventSubscriptionMap).forEach(([type, handlers]) =>
                handlers.slice().forEach((handler) => handler({type, values: [{data: result}]}))
            );
        },
        listenerCount: () => Object.values(eventSubscriptionMap)
            .reduce((count, handlers) => count + handlers.length, 0),
    };
}

function system(id: string, name: string, uid: string) {
    return {properties: {id, properties: {name, uid}}};
}

function stream(
    id: string,
    ownerId: string,
    definitions: string[],
    latest: any[] | Promise<any[]> | (() => any[] | Promise<any[]>),
    outputName?: string,
) {
    return {
        properties: {
            id,
            "system@id": ownerId,
            name: outputName ?? id,
            outputName: outputName ?? id,
            observedProperties: definitions.map((definition) => ({definition})),
        },
        searchObservations: cy.stub().resolves({
            nextPage: () => Promise.resolve(typeof latest === "function" ? latest() : latest),
        }),
        latestObservations: latest,
    };
}

function observation(result: any, resultTime = "2026-09-24T16:00:00.000Z") {
    return {result, resultTime};
}

function batchNode(name: string, streams: any[], failure?: Error): FakeNode {
    const searchObservations = cy.stub().callsFake(() => {
        if (failure)
            return Promise.reject(failure);

        return Promise.resolve({
            nextPage: async () => {
                const observations = await Promise.all(streams.map(async (item) => {
                    const latest = typeof item.latestObservations === "function"
                        ? item.latestObservations()
                        : item.latestObservations;
                    return (await Promise.resolve(latest)).map((entry: any) => ({
                        properties: {
                            "datastream@id": item.properties.id,
                            result: entry.result,
                            resultTime: entry.resultTime,
                        },
                    }));
                }));
                return observations.flat();
            },
        });
    });
    return {
        id: `node-${name}`,
        name,
        searchObservations,
        getObservationsApi: () => ({searchObservations}),
    };
}

function lane(
    name: string,
    systems: any[],
    streams: any[],
    sources: FakeSource[],
    parentNode: FakeNode = batchNode("Local Node", streams),
) {
    return {
        laneName: name,
        parentNode,
        systems,
        datastreams: streams,
        datasourcesRealtime: sources,
    } as any;
}

function healthView(
    scopedLaneMap: Map<string, any>,
    signalLaneMap = scopedLaneMap,
    laneMapReady = true,
) {
    const store = configureStore({reducer: {laneSlice: laneReducer}});
    // The production map contains class instances, which Immer does not freeze.
    // Keep the plain-object fakes out of Redux so their live callback registries
    // remain mutable while still exercising the selector as an update signal.
    store.dispatch(setLaneMap(new Map(Array.from(signalLaneMap.keys(), (key) => [key, {} as any]))));
    const context = {
        laneMapRef: {current: scopedLaneMap},
        laneMapReady,
        readyLaneNames: new Set(scopedLaneMap.keys()),
        activeViewKey: "north-gate",
        viewError: null,
        scopedHref: (path: string) => `${path}?view=north-gate`,
    };

    return (
        <Provider store={store as any}>
            <LanguageProvider>
                <DataSourceContext.Provider value={context as any}>
                    <HealthPage/>
                </DataSourceContext.Provider>
            </LanguageProvider>
        </Provider>
    );
}

describe("Status of Health page", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("renders every scoped lane, every camera, and current connection, fault, and occupancy snapshots", () => {
        const now = Date.parse("2026-09-24T16:00:00.000Z");
        cy.clock(now);

        const rpmConnection = stream("rpm-connection", "rpm-1", [CONNECTION_DEF], [observation({isConnected: true})]);
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], [observation({alarmState: "Background"})]);
        const neutron = stream("neutron", "rpm-1", [ALARM_DEF, NEUTRON_COUNT_DEF], [observation({alarmState: "Fault - Neutron High"})]);
        const tamper = stream("tamper", "rpm-1", [TAMPER_STATUS_DEF], [observation({tamperStatus: false})]);
        const occupancy = stream("occupancy-status", "lane-system-1", [OCCUPANCY_STATUS_DEF], [
            observation({isOccupied: true, occupancyStartTime: (now - 120_000) / 1000}),
        ], "occupancyStatus");
        const eastVideo = stream("east-video", "camera-east", [RASTER_IMAGE_DEF], []);
        const westVideo = stream("west-video", "camera-west", [RASTER_IMAGE_DEF], []);
        const canonicalConnectionDefinition = "http://www.opengis.net/def/property/OGC/0/ConnectionStatus";
        const eastConnection = stream("east-connection", "camera-east", [canonicalConnectionDefinition], [observation({isConnected: true})]);
        const westConnection = stream("west-connection", "camera-west", [canonicalConnectionDefinition], [observation({isConnected: false})]);
        const healthStreams = [rpmConnection, gamma, neutron, tamper, occupancy, eastConnection, westConnection];
        const sources = healthStreams.map((item) => dataSource(item.properties.id));
        const localNode = batchNode("Local Node", healthStreams);
        const scopedLane1 = lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
            system("camera-east", "Camera East", "urn:osh:sensor:ffmpeg:east"),
            system("camera-west", "Camera West", "urn:osh:sensor:ffmpeg:west"),
        ], [rpmConnection, gamma, neutron, tamper, occupancy, eastVideo, westVideo, eastConnection, westConnection], sources, localNode);
        const scopedLane2 = lane("Lane 2", [], [], [], localNode);
        const excludedLane = lane("Lane 99", [], [], []);
        const scoped = new Map([["Lane 1", scopedLane1], ["Lane 2", scopedLane2]]);
        const unscopedSignal = new Map([...scoped, ["Lane 99", excludedLane]]);

        cy.mount(healthView(scoped, unscopedSignal));

        cy.get('[data-testid="health-lane-Lane 1"]').within(() => {
            cy.contains("RPM (RPM 1) · Online");
            cy.contains("Camera East · Online");
            cy.contains("Camera West · Offline");
            cy.contains("Gamma high: Clear");
            cy.contains("Gamma low: Clear");
            cy.contains("Neutron high: Fault");
            cy.contains("Tamper: Clear");
            cy.contains("Extended occupancy: Fault");
            cy.contains("2:00");
        });
        cy.get('[data-testid="health-lane-Lane 2"]').should("exist");
        cy.contains("Lane 99").should("not.exist");
        cy.contains("Total lanes: 2");
        cy.contains("Lanes awaiting telemetry: 1");
    });

    it("never lets a delayed current snapshot overwrite a valid live update", () => {
        let resolveSnapshot: (observations: any[]) => void = () => {};
        const snapshot = new Promise<any[]>((resolve) => {
            resolveSnapshot = resolve;
        });
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], snapshot);
        const gammaSource = dataSource("gamma");
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma], [gammaSource])]]);

        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => expect(gammaSource.listenerCount()).to.equal(1));
        cy.then(() => gammaSource.emit({
            samplingTime: Date.parse("2026-09-24T16:01:00.000Z") / 1000,
            alarmState: "Fault - Gamma High",
        }));
        cy.contains("Gamma high: Fault");
        cy.then(() => resolveSnapshot([observation({alarmState: "Background"})]));
        cy.contains("Gamma high: Fault");
        cy.contains("Gamma low: Clear");
    });

    it("recovers a transition missed while the realtime connection is starting", () => {
        let resolveConnect: () => void = () => {};
        const connectGate = new Promise<void>((resolve) => {
            resolveConnect = resolve;
        });
        let latestState = "Background";
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], () => [
            observation({alarmState: latestState}, latestState === "Background"
                ? "2026-09-24T16:00:00.000Z"
                : "2026-09-24T16:01:00.000Z"),
        ]);
        const gammaSource = dataSource("gamma", connectGate);
        const localNode = batchNode("Local Node", [gamma]);
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma], [gammaSource], localNode)]]);

        cy.mount(healthView(laneMap));
        cy.contains("Gamma high: Clear");
        cy.then(() => {
            latestState = "Fault - Gamma High";
            // The fake source drops this event because its connection is not ready.
            gammaSource.emit({alarmState: latestState});
            resolveConnect();
        });

        cy.contains("Gamma high: Fault");
        cy.wrap(localNode.searchObservations).should("have.been.calledTwice");
        cy.wrap(gamma.searchObservations).should("not.have.been.called");
    });

    it("periodically reconciles current state when no live event arrives", () => {
        const now = Date.parse("2026-09-24T16:00:00.000Z");
        cy.clock(now);
        let latestState = "Background";
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], () => [
            observation({alarmState: latestState}, latestState === "Background"
                ? "2026-09-24T16:00:00.000Z"
                : "2026-09-24T16:01:00.000Z"),
        ]);
        const gammaSource = dataSource("gamma");
        const localNode = batchNode("Local Node", [gamma]);
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma], [gammaSource], localNode)]]);

        cy.mount(healthView(laneMap));
        cy.contains("Gamma high: Clear");
        cy.then(() => {
            latestState = "Fault - Gamma High";
        });
        cy.tick(30_000);

        cy.contains("Gamma high: Fault");
        cy.wrap(localNode.searchObservations).should("have.callCount", 3);
        cy.wrap(gamma.searchObservations).should("not.have.been.called");
    });

    it("loads and reconciles 50 lanes with one latest-observation query per node per pass", () => {
        cy.clock(Date.parse("2026-09-24T16:00:00.000Z"));
        const gammaStreams = Array.from({length: 50}, (_, index) => stream(
            `gamma-${index + 1}`,
            `rpm-${index + 1}`,
            [ALARM_DEF, GAMMA_COUNT_DEF],
            [observation({alarmState: "Background"})],
        ));
        const localNode = batchNode("Local Node", gammaStreams);
        const laneMap = new Map(gammaStreams.map((gamma, index) => [
            `Lane ${index + 1}`,
            lane(`Lane ${index + 1}`, [
                system(`rpm-${index + 1}`, `RPM ${index + 1}`, `urn:osh:system:rapiscan:${index + 1}`),
            ], [gamma], [dataSource(gamma.properties.id)], localNode),
        ]));

        cy.mount(healthView(laneMap));

        cy.contains("Total lanes: 50");
        cy.wrap(localNode.searchObservations).should("have.been.calledTwice");
        cy.then(() => {
            const [filter, pageSize] = localNode.searchObservations.firstCall.args;
            expect(filter.props.resultTime).to.equal("latest");
            expect(filter.props.dataStream.split(",")).to.have.length(50);
            expect(pageSize).to.equal(50);
            gammaStreams.forEach((gamma) => expect(gamma.searchObservations).not.to.have.been.called);
        });

        cy.tick(30_000);
        cy.wrap(localNode.searchObservations).should("have.callCount", 3);
    });

    it("isolates a failed node while applying batched observations from another node", () => {
        const goodGamma = stream("good-gamma", "good-rpm", [ALARM_DEF, GAMMA_COUNT_DEF], [
            observation({alarmState: "Fault - Gamma High"}),
        ]);
        const failedGamma = stream("failed-gamma", "failed-rpm", [ALARM_DEF, GAMMA_COUNT_DEF], [
            observation({alarmState: "Background"}),
        ]);
        const goodNode = batchNode("Good Node", [goodGamma]);
        const failedNode = batchNode("Failed Node", [failedGamma], new Error("node unavailable"));
        const laneMap = new Map([
            ["Lane 1", lane("Lane 1", [
                system("good-rpm", "Good RPM", "urn:osh:system:rapiscan:good"),
            ], [goodGamma], [dataSource("good-gamma")], goodNode)],
            ["Lane 2", lane("Lane 2", [
                system("failed-rpm", "Failed RPM", "urn:osh:system:rapiscan:failed"),
            ], [failedGamma], [dataSource("failed-gamma")], failedNode)],
        ]);

        cy.mount(healthView(laneMap));

        cy.get('[data-testid="health-lane-Lane 1"]').within(() => cy.contains("Gamma high: Fault"));
        cy.get('[data-testid="health-lane-Lane 2"]').within(() => cy.contains("Gamma high: Unknown"));
        cy.wrap(goodNode.searchObservations).should("have.been.calledTwice");
        cy.wrap(failedNode.searchObservations).should("have.been.calledTwice");
    });

    it("keeps the loading state while lane discovery is incomplete", () => {
        cy.mount(healthView(new Map(), new Map(), false));

        cy.contains("Loading lane health...");
        cy.contains("No lanes are currently available.").should("not.exist");
    });

    it("keeps missing or failed fault telemetry unknown and out of the healthy count", () => {
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], []);
        const neutron = stream("neutron", "rpm-1", [ALARM_DEF, NEUTRON_COUNT_DEF], [observation({alarmState: "Background"})]);
        const sources = [dataSource("gamma"), dataSource("neutron")];
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma, neutron], sources)]]);

        cy.mount(healthView(laneMap));

        cy.contains("Gamma high: Unknown");
        cy.contains("Gamma low: Unknown");
        cy.contains("Neutron high: Clear");
        cy.contains("Tamper: Unknown");
        cy.contains("Healthy lanes: 0");
        cy.contains("Lanes awaiting telemetry: 1");
    });

    it("uses the canonical occupancy start time and persists a user threshold", () => {
        const now = Date.parse("2026-09-24T16:00:00.000Z");
        cy.clock(now);
        localStorage.setItem("oscar.health.extendedOccupancyMinutes", "2");
        const occupancy = stream("occupancy-status", "lane-system-1", [OCCUPANCY_STATUS_DEF], [
            observation({isOccupied: true, occupancyStartTime: (now - 90_000) / 1000}),
        ], "occupancyStatus");
        const gamma = stream("gamma", "rpm-1", [ALARM_DEF, GAMMA_COUNT_DEF], [observation({alarmState: "Scan"})]);
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma, occupancy], [dataSource("gamma"), dataSource("occupancy-status")])]]);

        cy.mount(healthView(laneMap));

        cy.get('input[type="number"]').should(($input) => expect($input.val()).to.equal("2"));
        cy.contains("Extended occupancy: Clear");
        cy.contains("1:30");
        cy.get('input[type="number"]').type("{selectall}1");
        cy.contains("Extended occupancy: Fault");
        cy.then(() => expect(localStorage.getItem("oscar.health.extendedOccupancyMinutes")).to.equal("1"));
    });

    it("removes shared datasource callbacks on unmount and does not accumulate them on remount", () => {
        cy.clock(Date.parse("2026-09-24T16:00:00.000Z"));
        const connection = stream("rpm-connection", "rpm-1", [CONNECTION_DEF], [observation({isConnected: true})]);
        const source = dataSource("rpm-connection");
        const localNode = batchNode("Local Node", [connection]);
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [connection], [source], localNode)]]);

        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => expect(source.listenerCount()).to.equal(1));
        cy.wrap(localNode.searchObservations).should("have.been.calledTwice");
        cy.mount(<div data-testid="unmounted-health"/>);
        cy.wrap(null).should(() => {
            expect(source.listenerCount()).to.equal(0);
            expect(source.disconnect).to.have.been.calledOnce;
        });
        cy.tick(30_000);
        cy.wrap(localNode.searchObservations).should("have.been.calledTwice");
        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => {
            expect(source.listenerCount()).to.equal(1);
            expect(source.connect).to.have.been.calledTwice;
        });
    });

    it("leaves a shared datasource connected when another callback remains", () => {
        const connection = stream("rpm-connection", "rpm-1", [CONNECTION_DEF], [observation({isConnected: true})]);
        const source = dataSource("rpm-connection");
        const otherHandler = () => {};
        source.subscribe(otherHandler, ["data"]);
        const localNode = batchNode("Local Node", [connection]);
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [connection], [source], localNode)]]);

        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => expect(source.listenerCount()).to.equal(2));
        cy.mount(<div data-testid="unmounted-health"/>);
        cy.wrap(null).should(() => {
            expect(source.listenerCount()).to.equal(1);
            expect(source.disconnect).not.to.have.been.called;
        });
    });

    it("keeps a newer reconnect request after an earlier connect fails", () => {
        let rejectFirstConnect: (error: Error) => void = () => {};
        let markFirstConnectStarted: () => void = () => {};
        const firstConnectStarted = new Promise<void>((resolve) => {
            markFirstConnectStarted = resolve;
        });
        let connectAttempt = 0;
        const originalConnect = cy.stub().callsFake(() => {
            connectAttempt++;
            if (connectAttempt === 1) {
                markFirstConnectStarted();
                return new Promise<void>((_resolve, reject) => {
                    rejectFirstConnect = reject;
                });
            }
            return Promise.resolve();
        });
        const originalDisconnect = cy.stub().resolves();
        const original = {
            connect: originalConnect,
            disconnect: originalDisconnect,
        };
        const managed = manageSharedConnection(original);

        cy.then(async () => {
            const failedConnect = managed.connect().catch((error: Error) => error);
            await firstConnectStarted;
            const disconnect = managed.disconnect();
            const reconnect = managed.connect();
            rejectFirstConnect(new Error("initial connect failed"));

            await Promise.all([failedConnect, disconnect, reconnect]);
            expect(originalConnect).to.have.been.calledTwice;

            await managed.disconnect();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("waits for disconnect to finish before reconnecting a shared source", () => {
        let finishDisconnect: () => void = () => {};
        let markDisconnectStarted: () => void = () => {};
        const disconnectStarted = new Promise<void>((resolve) => {
            markDisconnectStarted = resolve;
        });
        const calls: string[] = [];
        const original = {
            connect: cy.stub().callsFake(() => {
                calls.push("connect");
                return Promise.resolve();
            }),
            disconnect: cy.stub().callsFake(() => {
                calls.push("disconnect-start");
                markDisconnectStarted();
                return new Promise<void>((resolve) => {
                    finishDisconnect = () => {
                        calls.push("disconnect-finish");
                        resolve();
                    };
                });
            }),
        };
        const managed = manageSharedConnection(original);

        cy.then(async () => {
            await managed.connect();
            const disconnect = managed.disconnect();
            const reconnect = managed.connect();
            await disconnectStarted;
            expect(calls).to.deep.equal(["connect", "disconnect-start"]);
            finishDisconnect();
            await Promise.all([disconnect, reconnect]);
            expect(calls).to.deep.equal(["connect", "disconnect-start", "disconnect-finish", "connect"]);
        });
    });
});
