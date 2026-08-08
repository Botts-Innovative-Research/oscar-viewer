/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Phase A of the comm-failure e2e (see commFailureShared.ts for environment
// constraints; phase B = CommFailureRecovery.cy.tsx): stopping a module in the
// admin console silences it WITHOUT a final isConnected:false observation, so
// the viewer must infer "Comm Failure" from message-arrival age. This spec
// proves the LIVE watchdog: the page is already open when silence crosses the
// threshold — no reload in between.
//
//   npm run build && STATIC_ROOT=web PORT=8090 node serve-proxy.js
//   npx cypress run --spec cypress/e2e/CommFailureDetection.cy.tsx \
//     --config baseUrl=http://127.0.0.1:8090,testIsolation=true --env nodePort=8090
//
// Leaves the Patrol module STOPPED for phase B.

import {
    ADMIN_URL, ONLINE_ICONS, PATROL, WALKER_NORMAL, WALKER_OFFLINE,
    ensureModuleState, laneChip, moduleAction, selectModule, visitDashboard,
} from './commFailureShared';

// retries: an app visit can intermittently land the stale-document artifact
// (commFailureShared.ts) — a retried test re-navigates from a fresh context.
describe('Comm failure detection when a module is stopped (phase A: live watchdog)', {retries: 2}, () => {

    it('ensures the Patrol module is started (self-heal from prior runs)', () => {
        ensureModuleState(PATROL, 'STARTED');
        // Let the driver re-establish its detector feed before the baseline.
        cy.wait(3000);
    });

    it('baseline: Patrol chip is online and its walker is on the map', () => {
        visitDashboard();
        laneChip(PATROL).find('[data-testid="FavoriteIcon"]', {timeout: 60000})
            .should('exist');
        cy.get(WALKER_NORMAL, {timeout: 60000}).should('exist');
    });

    it('stops the Patrol module in the admin console', () => {
        cy.visit(ADMIN_URL);
        selectModule(PATROL);
        moduleAction(PATROL, 'Stop', 'STOPPED');
    });

    it('dashboard flips the chip to Comm Failure and greys the walker', () => {
        visitDashboard();

        // The stop happened seconds ago, so the latest stored observation is
        // still fresh and reconcile initially reports online — the live
        // watchdog must trip as silence crosses LANE_COMMS_STALE_MS (15 s,
        // + <=5 s sweep). No reload happens in between: this asserts the
        // watchdog path, not just load-time reconcile.
        laneChip(PATROL).find('[data-testid="CloseIcon"]', {timeout: 45000})
            .should('exist');

        // Per-lane detection, not transport-wide: other lanes stay live.
        cy.get(ONLINE_ICONS).should(($icons) => {
            expect($icons.length, 'other lanes still online/scanning').to.be.greaterThan(0);
        });

        // Walker greys in place with the "no data since" annotation.
        cy.get(WALKER_OFFLINE, {timeout: 20000}).should('exist');
        cy.get('.mobile-unit-marker div[style*="9e9e9e"]').should('exist');
    });
});
