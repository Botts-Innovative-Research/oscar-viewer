/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Mobile radiation detector (RS350 backpack / Kromek D5) map coverage:
//
// 1. Walker lanes get a live moving marker (divIcon, class mobile-unit-marker)
//    driven by the locRT registry stream — its screen position must change
//    between fixes (pre-feature, markers were create-once static circles).
// 2. Mobile alarms drop persistent markers (class mobile-alarm-marker) at the
//    coordinates carried on the occupancy observation.
// 3. Adjudicating an alarm recolors its marker from hollow-red (unadjudicated)
//    to the adjudication group color.
// 4. Walker alarms appear in the dashboard alarm table alongside RPM lanes.
//
// Requires: the local node with WALKER1/WALKER2 lanes fed by the mock sims
// (tools/mobile-detector-mocks) and the same-origin verification proxy:
//   STATIC_ROOT=web PORT=8090 node serve-proxy.js
//   npx cypress run --spec cypress/e2e/MobileDetectorMapRegression.cy.tsx \
//     --config baseUrl=http://localhost:8090 --env nodePort=8090

const NODE_PORT = Number(Cypress.env('nodePort') || 8090);
const API = `http://localhost:${NODE_PORT}/sensorhub/api`;

const LOCAL_NODE = [{
    name: 'cypress-local',
    address: 'localhost',
    port: NODE_PORT,
    oshPathRoot: '/sensorhub',
    csAPIEndpoint: '/api',
    bucketsEndpoint: '/buckets',
    auth: {username: 'admin', password: 'oscar'},
    isSecure: false,
    isDefaultNode: true,
}];

function visitDashboard() {
    cy.visit('/', {
        auth: {username: 'admin', password: 'oscar'},
        onBeforeLoad(win) {
            win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
            // testIsolation is off and eventPreview is redux-persisted: a prior
            // test's VIEW EVENT would reopen the preview on the dashboard and
            // replace the quick-view map. Start each test with clean UI state.
            win.localStorage.removeItem('persist:root');
        },
    });
}

describe('Mobile detector map + alarm integration', () => {

    it('shows walker markers that actually move', () => {
        visitDashboard();

        cy.get('#mapcontainer .mobile-unit-marker', {timeout: 60000})
            .should('have.length.greaterThan', 0);

        // The mock walkers move continuously; between two samples ~8s apart the
        // marker's screen position must change (setLatLng path). Guard against
        // fitBounds shifting the whole view by also checking a static lane
        // marker as a reference point is NOT required: live fixes never
        // re-trigger fitBounds after the first one (asserted in the last test).
        cy.get('#mapcontainer .mobile-unit-marker').first().then(($m) => {
            const before = $m[0].getBoundingClientRect();
            cy.wait(8000);
            cy.get('#mapcontainer .mobile-unit-marker').first().should(($m2) => {
                const after = $m2[0].getBoundingClientRect();
                const dist = Math.hypot(after.left - before.left, after.top - before.top);
                expect(dist, 'marker screen movement (px)').to.be.greaterThan(2);
            });
        });

        // Breadcrumb trail follows the walker
        cy.get('#mapcontainer path.mobile-trail', {timeout: 30000})
            .should('have.length.greaterThan', 0);
    });

    it('drops alarm markers where mobile alarms occurred', () => {
        visitDashboard();

        // The mock hotspots fire on every route pass, so the 'today' window is
        // guaranteed to contain occupancies once the sims have run a loop.
        cy.get('#mapcontainer path.mobile-alarm-marker', {timeout: 90000})
            .should('have.length.greaterThan', 0);
    });

    it('recolors an alarm marker when its occupancy is adjudicated', () => {
        // Find an occupancy obs + the WALKER1 adjudication control stream first
        cy.request({
            url: `${API}/systems?limit=100`,
            auth: {user: 'admin', pass: 'oscar'},
        }).then((resp) => {
            const lane = resp.body.items.find((s: any) => s.properties?.uid === 'urn:osh:system:lane:WALKER1');
            expect(lane, 'WALKER1 lane system').to.exist;

            cy.request({
                url: `${API}/systems/${lane.id}/controlstreams`,
                auth: {user: 'admin', pass: 'oscar'},
            }).then((csResp) => {
                const adjCs = csResp.body.items.find((cs: any) =>
                    JSON.stringify(cs).toLowerCase().includes('adjudication')
                    || JSON.stringify(cs).toLowerCase().includes('feedback'));
                expect(adjCs, 'adjudication control stream').to.exist;

                cy.request({
                    url: `${API}/datastreams?limit=200`,
                    auth: {user: 'admin', pass: 'oscar'},
                }).then((dsResp) => {
                    const occDs = dsResp.body.items.find((d: any) =>
                        d.outputName === 'occupancy'
                        && d['system@link']?.uid?.includes('rs350-occupancy:WALKER1'));
                    expect(occDs, 'WALKER1 occupancy datastream').to.exist;

                    cy.request({
                        url: `${API}/datastreams/${occDs.id}/observations?limit=1`,
                        auth: {user: 'admin', pass: 'oscar'},
                    }).then((obsResp) => {
                        const obs = obsResp.body.items[0];
                        expect(obs, 'a WALKER1 occupancy observation').to.exist;

                        // Adjudicate it: Code 4 (NORM Found) => group "Innocent Alarm" (green)
                        cy.request({
                            method: 'POST',
                            url: `${API}/controlstreams/${adjCs.id}/commands`,
                            auth: {user: 'admin', pass: 'oscar'},
                            headers: {'Content-Type': 'application/json'},
                            body: {
                                parameters: {
                                    feedback: 'cypress mobile adjudication test',
                                    adjudicationCode: 4,
                                    isotopesCount: 0,
                                    isotopes: [],
                                    secondaryInspectionStatus: 'NONE',
                                    filePathCount: 0,
                                    filePaths: [],
                                    occupancyObsId: obs.id,
                                    vehicleId: '',
                                },
                            },
                        }).its('status').should('be.within', 200, 299);
                    });
                });
            });
        });

        // Load the app AFTER adjudicating: the marker for that occupancy must
        // come up in the Innocent Alarm color (#2e7d32), not hollow red.
        visitDashboard();
        cy.get('#mapcontainer path.mobile-alarm-marker', {timeout: 90000})
            .should(($paths) => {
                const greens = $paths.toArray().filter((p) =>
                    (p.getAttribute('stroke') || '').toLowerCase() === '#2e7d32');
                expect(greens.length, 'adjudicated (green) alarm markers').to.be.greaterThan(0);
            });
    });

    it('opens event details from an alarm marker popup (SPA, no crash)', () => {
        visitDashboard();

        cy.get('#mapcontainer path.mobile-alarm-marker', {timeout: 90000})
            .first().click({force: true});
        cy.get('.mobile-view-event', {timeout: 15000}).click();

        cy.url({timeout: 15000}).should('include', '/event-details');
        // The page must actually render the event (redux state survived the
        // client-side navigation) and not hit an error boundary
        cy.contains(/Backpack 1|D5 Walker/, {timeout: 30000}).should('exist');
        cy.contains('Application error').should('not.exist');
    });

    it('lists walker alarms in the dashboard alarm table and keeps zoom stable', () => {
        visitDashboard();

        // Walker rows alongside the RPM lanes
        cy.contains('[role="row"], .MuiDataGrid-row', /Backpack 1|D5 Walker/, {timeout: 90000})
            .should('exist');

        // Live fixes must not re-trigger fitBounds: while the walker markers
        // move, a FIXED-POSITION alarm marker's screen position must stay put
        // (the view isn't being re-fitted). Alarm markers are used as the
        // reference because they're guaranteed present; static lane markers
        // ride a batch-datasource chain that can lag under load (pre-existing).
        const fixedSel = '#mapcontainer path.mobile-alarm-marker';
        cy.get(fixedSel, {timeout: 90000}).should('have.length.greaterThan', 0);
        cy.wait(5000); // let the initial fitBounds (800ms debounce) fully settle
        cy.get(fixedSel).first().then(($p) => {
            const before = $p[0].getBoundingClientRect();
            cy.wait(10000);
            cy.get(fixedSel).first().should(($p2) => {
                const after = $p2[0].getBoundingClientRect();
                const drift = Math.hypot(after.left - before.left, after.top - before.top);
                expect(drift, 'fixed marker screen drift during live movement (px)').to.be.lessThan(1);
            });
        });
    });
});
