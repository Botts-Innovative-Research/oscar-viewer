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
// 3. The alarm layer shows UNADJUDICATED alarms only: adjudicating an event
//    removes its marker live and keeps it gone on reload.
// 4. Walker alarms appear in the dashboard alarm table alongside RPM lanes.
//
// The mobile lane is DISCOVERED from the node (any lane whose subsystem UID
// matches rsi:rs350 or kromek:d5), so the spec doesn't depend on how lanes
// are named. Requires a live mobile lane fed by the mock sims
// (tools/mobile-detector-mocks) and the same-origin verification proxy:
//   STATIC_ROOT=web PORT=8090 node serve-proxy.js
//   npx cypress run --spec cypress/e2e/MobileDetectorMapRegression.cy.tsx \
//     --config baseUrl=http://localhost:8090 --env nodePort=8090

const NODE_PORT = Number(Cypress.env('nodePort') || 8090);
const API = `http://localhost:${NODE_PORT}/sensorhub/api`;
const AUTH = {user: 'admin', pass: 'oscar'};

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

interface MobileLaneCtx {
    laneName: string;
    laneId: string;
    adjCsId: string;
    occDsId: string;
}

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

/** Newest occupancy obs with no adjudication yet; polls until one exists —
 *  earlier runs / Adjudicate All may have consumed every existing alarm, and
 *  the mock walkers produce a fresh one on every hotspot pass (minutes). */
function newestUnadjudicated(occDsId: string, attemptsLeft: number): Cypress.Chainable<string> {
    return cy.request({
        url: `${API}/datastreams/${occDsId}/observations?limit=100`,
        auth: AUTH,
    }).then((resp) => {
        const candidates = (resp.body.items || [])
            .filter((o: any) => !((o.result || {}).adjudicatedIds || []).length);
        if (candidates.length > 0) {
            const newest = candidates.reduce((a: any, b: any) =>
                Date.parse(a.phenomenonTime) >= Date.parse(b.phenomenonTime) ? a : b);
            return cy.wrap<string>(newest.id, {log: false});
        }
        expect(attemptsLeft, 'attempts left waiting for an unadjudicated walker alarm').to.be.greaterThan(0);
        cy.wait(15000);
        return newestUnadjudicated(occDsId, attemptsLeft - 1);
    });
}

/** Find a mobile lane (RS350/D5 subsystem), its adjudication control stream
 *  and its occupancy datastream — whatever the lane happens to be named. */
function discoverMobileLane(): Cypress.Chainable<MobileLaneCtx> {
    return cy.request({url: `${API}/systems?limit=100`, auth: AUTH}).then((resp) => {
        const items = resp.body.items || [];
        const sensor = items.find((s: any) => /rsi:rs350|kromek:d5/i.test(s.properties?.uid || ''));
        expect(sensor, 'a mobile detector sensor system').to.exist;
        const suffix = (sensor.properties.uid.split(':').pop() || '').toLowerCase();

        const lane = items.find((s: any) => {
            const uid = s.properties?.uid || '';
            return uid.startsWith('urn:osh:system:lane:')
                && (uid.split(':').pop() || '').toLowerCase() === suffix;
        });
        expect(lane, `lane system for mobile suffix ${suffix}`).to.exist;

        return cy.request({url: `${API}/systems/${lane.id}/controlstreams`, auth: AUTH}).then((csResp) => {
            const adjCs = (csResp.body.items || []).find((cs: any) =>
                JSON.stringify(cs).toLowerCase().includes('adjudication')
                || JSON.stringify(cs).toLowerCase().includes('feedback'));
            expect(adjCs, 'adjudication control stream').to.exist;

            return cy.request({url: `${API}/datastreams?limit=200`, auth: AUTH}).then((dsResp) => {
                const occDs = (dsResp.body.items || []).find((d: any) => {
                    const sysUid = (d['system@link']?.uid || '').toLowerCase();
                    return d.outputName === 'occupancy'
                        && /:(rs350|d5)-occupancy:/.test(sysUid)
                        && sysUid.endsWith(`:${suffix}`);
                });
                expect(occDs, 'mobile occupancy datastream').to.exist;

                return cy.wrap<MobileLaneCtx>({
                    laneName: lane.properties.name,
                    laneId: lane.id,
                    adjCsId: adjCs.id,
                    occDsId: occDs.id,
                }, {log: false});
            });
        });
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

        // Only UNADJUDICATED alarms get markers; if every existing event has
        // been adjudicated, this waits for the next live hotspot pass.
        cy.get('#mapcontainer path.mobile-alarm-marker', {timeout: 300000})
            .should('have.length.greaterThan', 0);
    });

    it('removes an alarm marker when its occupancy is adjudicated', () => {
        discoverMobileLane().then((ctx) => {
            newestUnadjudicated(ctx.occDsId, 20).as('obsId');

            // The unadjudicated event has a marker...
            visitDashboard();
            cy.get<string>('@obsId').then((obsId) => {
                cy.get(`#mapcontainer path.mobile-alarm-marker[data-occ-obs="${obsId}"]`, {timeout: 90000})
                    .should('exist');

                // ...adjudicate it while the page is open (Code 4: NORM Found)...
                cy.request({
                    method: 'POST',
                    url: `${API}/controlstreams/${ctx.adjCsId}/commands`,
                    auth: AUTH,
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
                            occupancyObsId: obsId,
                            vehicleId: '',
                        },
                    },
                }).its('status').should('be.within', 200, 299);

                // ...and the marker disappears live (realtime command status)...
                cy.get(`#mapcontainer path.mobile-alarm-marker[data-occ-obs="${obsId}"]`, {timeout: 30000})
                    .should('not.exist');

                // ...and never renders on a fresh load (the historical pass is
                // gated on adjudication data, so there is no flash either).
                visitDashboard();
                cy.get('#mapcontainer .mobile-unit-marker', {timeout: 60000}).should('exist');
                cy.wait(15000); // adjudication statuses + gated historical pass
                cy.get(`#mapcontainer path.mobile-alarm-marker[data-occ-obs="${obsId}"]`)
                    .should('not.exist');
            });
        });
    });

    it('opens event details from an alarm marker popup (SPA, no crash)', () => {
        discoverMobileLane().then((ctx) => {
            visitDashboard();

            cy.get('#mapcontainer path.mobile-alarm-marker', {timeout: 300000})
                .first().click({force: true});
            cy.get('.mobile-view-event', {timeout: 15000}).click();

            cy.url({timeout: 15000}).should('include', '/event-details');
            // The page must actually render the event (redux state survived the
            // client-side navigation) and not hit an error boundary
            cy.contains(ctx.laneName, {timeout: 30000}).should('exist');
            cy.contains('Application error').should('not.exist');
        });
    });

    it('lists walker alarms in the dashboard alarm table and keeps zoom stable', () => {
        discoverMobileLane().then((ctx) => {
            visitDashboard();

            // Walker rows alongside the RPM lanes. The alarm table hides
            // adjudicated events, so this may wait for the next live alarm.
            cy.contains('[role="row"], .MuiDataGrid-row', ctx.laneName, {timeout: 300000})
                .should('exist');
        });

        // Live fixes must not re-trigger fitBounds: while the walker markers
        // move, a FIXED-POSITION alarm marker's screen position must stay put
        // (the view isn't being re-fitted). Alarm markers are used as the
        // reference because they're guaranteed present; static lane markers
        // ride a batch-datasource chain that can lag under load (pre-existing).
        const fixedSel = '#mapcontainer path.mobile-alarm-marker';
        cy.get(fixedSel, {timeout: 300000}).should('have.length.greaterThan', 0);
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
