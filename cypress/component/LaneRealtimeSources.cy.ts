import React, {useEffect, useState} from "react";
import {
    acquireSharedConnection,
    disposeSharedConnection,
    findRealtimeDataSourceForStream,
    getRealtimeDataSourceStreamId,
    LaneMapEntry,
    manageSharedConnection,
} from "../../src/lib/data/oscar/LaneCollection";

function SharedSourceConsumer({source, name}: {source: any; name: string}) {
    useEffect(() => {
        const lease = acquireSharedConnection(source);
        void lease.ready.catch(() => undefined);
        return () => {
            void lease.release().catch(() => undefined);
        };
    }, [source]);
    return React.createElement("span", {"data-testid": `${name}-consumer`}, name);
}

function RouteHandoffHarness({source}: {source: any}) {
    const [dashboardOpen, setDashboardOpen] = useState(true);
    const [detailsOpen, setDetailsOpen] = useState(false);
    return React.createElement(
        React.Fragment,
        null,
        React.createElement("button", {
            "data-testid": "open-details",
            onClick: () => setDetailsOpen(true),
        }, "Open details"),
        React.createElement("button", {
            "data-testid": "close-dashboard",
            onClick: () => setDashboardOpen(false),
        }, "Close dashboard"),
        React.createElement("button", {
            "data-testid": "close-details",
            onClick: () => setDetailsOpen(false),
        }, "Close details"),
        dashboardOpen && React.createElement(SharedSourceConsumer, {source, name: "dashboard"}),
        detailsOpen && React.createElement(SharedSourceConsumer, {source, name: "details"}),
    );
}

describe("lane realtime datasource ownership", () => {
    it("keeps a cached stream connected while lane details still owns it", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const dashboardLease = acquireSharedConnection(source);
            await dashboardLease.ready;

            // Lane Details acquires the same cached source before the
            // Dashboard route finishes unmounting.
            const laneDetailsLease = acquireSharedConnection(source);
            await Promise.all([laneDetailsLease.ready, dashboardLease.release()]);

            expect(originalConnect).to.have.been.calledOnce;
            expect(originalDisconnect).not.to.have.been.called;

            await laneDetailsLease.release();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("does not disconnect until chart and status consumers both release the stream", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const chartLease = acquireSharedConnection(source);
            const statusLease = acquireSharedConnection(source);
            await Promise.all([chartLease.ready, statusLease.ready]);
            await chartLease.release();
            expect(originalDisconnect).not.to.have.been.called;

            await statusLease.release();
            expect(originalConnect).to.have.been.calledOnce;
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("keeps a lease connected when a legacy caller disconnects", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            await source.connect();
            const lease = acquireSharedConnection(source);
            await lease.ready;

            await source.disconnect();
            expect(originalConnect).to.have.been.calledOnce;
            expect(originalDisconnect).not.to.have.been.called;

            await lease.release();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("does not retain a failed legacy request when a lease queues behind it", () => {
        let rejectLegacyConnect: (error: Error) => void = () => undefined;
        let markLegacyConnectStarted: () => void = () => undefined;
        const legacyConnectStarted = new Promise<void>((resolve) => {
            markLegacyConnectStarted = resolve;
        });
        const originalConnect = cy.stub();
        originalConnect.onFirstCall().callsFake(() => {
            markLegacyConnectStarted();
            return new Promise<void>((_resolve, reject) => {
                rejectLegacyConnect = reject;
            });
        });
        originalConnect.onSecondCall().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const failedLegacyConnect = source.connect().catch((error: Error) => error);
            await legacyConnectStarted;

            // This lease adds a lifecycle transition without superseding the
            // legacy request. The original failure must still clear that
            // request before the lease's independent retry succeeds.
            const lease = acquireSharedConnection(source);
            rejectLegacyConnect(new Error("initial legacy connect failed"));

            const legacyError = await failedLegacyConnect;
            expect(legacyError.message).to.equal("initial legacy connect failed");
            await lease.ready;
            expect(originalConnect).to.have.been.calledTwice;

            await lease.release();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("supports the reverse route order without stealing the first view's lease", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const laneDetailsLease = acquireSharedConnection(source);
            await laneDetailsLease.ready;
            const dashboardLease = acquireSharedConnection(source);
            await dashboardLease.ready;

            await laneDetailsLease.release();
            expect(originalDisconnect).not.to.have.been.called;

            await dashboardLease.release();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("does not accumulate ownership across repeated effect rerenders", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            let currentLease = acquireSharedConnection(source);
            await currentLease.ready;

            for (let index = 0; index < 5; index++) {
                const previousLease = currentLease;
                currentLease = acquireSharedConnection(source);
                await Promise.all([currentLease.ready, previousLease.release()]);
            }

            expect(originalConnect).to.have.been.calledOnce;
            expect(originalDisconnect).not.to.have.been.called;

            await currentLease.release();
            await currentLease.release();
            expect(originalDisconnect).to.have.been.calledOnce;
        });
    });

    it("force-disposes a replaced lane cache and invalidates outstanding leases", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });
        const lane = new LaneMapEntry({} as any);
        lane.datasourcesRealtime = [source];

        cy.then(async () => {
            const firstLease = acquireSharedConnection(source);
            const secondLease = acquireSharedConnection(source);
            await Promise.all([firstLease.ready, secondLease.ready]);

            lane.resetDatasources();
            await disposeSharedConnection(source);
            expect(originalDisconnect).to.have.been.calledOnce;

            await firstLease.release();
            await secondLease.release();
            expect(originalDisconnect).to.have.been.calledOnce;

            const acquisitionError = await acquireSharedConnection(source).ready.catch(error => error);
            expect(acquisitionError.message).to.contain("disposed realtime datasource");
        });
    });

    it("retries a transient transport failure while force-disposing", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub();
        originalDisconnect.onFirstCall().rejects(new Error("temporary disconnect failure"));
        originalDisconnect.onSecondCall().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const lease = acquireSharedConnection(source);
            await lease.ready;
            await disposeSharedConnection(source);

            expect(originalDisconnect).to.have.been.calledTwice;
            await lease.release();
            expect(originalDisconnect).to.have.been.calledTwice;
        });
    });

    it("retries a transient transport failure while releasing the final lease", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub();
        originalDisconnect.onFirstCall().rejects(new Error("temporary disconnect failure"));
        originalDisconnect.onSecondCall().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.then(async () => {
            const lease = acquireSharedConnection(source);
            await lease.ready;
            await lease.release();

            expect(originalDisconnect).to.have.been.calledTwice;
            await lease.release();
            expect(originalDisconnect).to.have.been.calledTwice;
        });
    });

    it("holds the actual mounted consumer connection through a route handoff", () => {
        const originalConnect = cy.stub().resolves();
        const originalDisconnect = cy.stub().resolves();
        const source = manageSharedConnection({
            connect: originalConnect,
            disconnect: originalDisconnect,
        });

        cy.mount(React.createElement(RouteHandoffHarness, {source}));
        cy.wrap(originalConnect).should("have.been.calledOnce");
        cy.get('[data-testid="open-details"]').click();
        cy.get('[data-testid="details-consumer"]').should("exist");
        cy.wrap(originalConnect).should("have.been.calledOnce");

        cy.get('[data-testid="close-dashboard"]').click();
        cy.get('[data-testid="dashboard-consumer"]').should("not.exist");
        cy.wrap(originalDisconnect).should("not.have.been.called");

        cy.get('[data-testid="close-details"]').click();
        cy.get('[data-testid="details-consumer"]').should("not.exist");
        cy.wrap(originalDisconnect).should("have.been.calledOnce");
    });
});

describe("lane realtime datasource binding", () => {
    const gammaSource = {
        properties: {resource: "/datastreams/gamma-stream/observations"},
    };
    const neutronSource = {
        properties: {resource: "/datastreams/neutron-stream/observations"},
    };

    it("binds by resource ID even when discovery arrays have different orders", () => {
        const lane = {
            datasourcesRealtime: [neutronSource, gammaSource],
        } as any;
        const gammaStream = {properties: {id: "gamma-stream"}} as any;
        const neutronStream = {properties: {id: "neutron-stream"}} as any;

        expect(findRealtimeDataSourceForStream(lane, gammaStream)).to.equal(gammaSource);
        expect(findRealtimeDataSourceForStream(lane, neutronStream)).to.equal(neutronSource);
    });

    it("decodes stream IDs and rejects unrelated resource paths", () => {
        expect(getRealtimeDataSourceStreamId({
            properties: {resource: "/datastreams/gamma%2Dstream/observations?format=json"},
        })).to.equal("gamma-stream");
        expect(getRealtimeDataSourceStreamId({
            properties: {resource: "/controlstreams/gamma-stream/status"},
        })).to.equal(undefined);
    });

    it("returns undefined instead of substituting a different stream", () => {
        const lane = {datasourcesRealtime: [neutronSource]} as any;
        const gammaStream = {properties: {id: "gamma-stream"}} as any;

        expect(findRealtimeDataSourceForStream(lane, gammaStream)).to.equal(undefined);
    });
});
