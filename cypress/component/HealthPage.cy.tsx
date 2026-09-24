import React from "react";
import {configureStore} from "@reduxjs/toolkit";
import {Provider} from "react-redux";
import HealthPage from "../../src/app/health/page";
import {DataSourceContext} from "../../src/app/contexts/DataSourceContext";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import laneReducer, {setLaneMap} from "../../src/lib/state/OSCARLaneSlice";
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
    emit: (result: any) => void;
    listenerCount: () => number;
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
    };
}

function observation(result: any, resultTime = "2026-09-24T16:00:00.000Z") {
    return {result, resultTime};
}

function lane(name: string, systems: any[], streams: any[], sources: FakeSource[]) {
    return {
        laneName: name,
        parentNode: {name: "Local Node"},
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
        const scopedLane1 = lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
            system("camera-east", "Camera East", "urn:osh:sensor:ffmpeg:east"),
            system("camera-west", "Camera West", "urn:osh:sensor:ffmpeg:west"),
        ], [rpmConnection, gamma, neutron, tamper, occupancy, eastVideo, westVideo, eastConnection, westConnection], sources);
        const scopedLane2 = lane("Lane 2", [], [], []);
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
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma], [gammaSource])]]);

        cy.mount(healthView(laneMap));
        cy.contains("Gamma high: Clear");
        cy.then(() => {
            latestState = "Fault - Gamma High";
            // The fake source drops this event because its connection is not ready.
            gammaSource.emit({alarmState: latestState});
            resolveConnect();
        });

        cy.contains("Gamma high: Fault");
        cy.wrap(gamma.searchObservations).should("have.been.calledTwice");
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
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [gamma], [gammaSource])]]);

        cy.mount(healthView(laneMap));
        cy.contains("Gamma high: Clear");
        cy.then(() => {
            latestState = "Fault - Gamma High";
        });
        cy.tick(30_000);

        cy.contains("Gamma high: Fault");
        cy.wrap(gamma.searchObservations).should("have.callCount", 3);
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
        const laneMap = new Map([["Lane 1", lane("Lane 1", [
            system("rpm-1", "RPM 1", "urn:osh:system:rapiscan:1"),
        ], [connection], [source])]]);

        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => expect(source.listenerCount()).to.equal(1));
        cy.wrap(connection.searchObservations).should("have.been.calledTwice");
        cy.mount(<div data-testid="unmounted-health"/>);
        cy.wrap(null).should(() => expect(source.listenerCount()).to.equal(0));
        cy.tick(30_000);
        cy.wrap(connection.searchObservations).should("have.been.calledTwice");
        cy.mount(healthView(laneMap));
        cy.wrap(null).should(() => {
            expect(source.listenerCount()).to.equal(1);
            expect(source.connect).to.have.been.calledTwice;
        });
    });
});
