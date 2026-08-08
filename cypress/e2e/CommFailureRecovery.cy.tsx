/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Phase B of the comm-failure e2e (see commFailureShared.ts for environment
// constraints; phase A = CommFailureDetection.cy.tsx): proves the RELOAD path
// (reconciliation must treat a stale latest-observation as offline instead of
// re-asserting green from its stored isConnected:true) and full recovery once
// the module publishes again.
//
//   npx cypress run --spec cypress/e2e/CommFailureRecovery.cy.tsx \
//     --config baseUrl=http://127.0.0.1:8090,testIsolation=true --env nodePort=8090
//
// Self-healing: stops the module first if phase A didn't run. Leaves the
// module STARTED.

import {
    PATROL, WALKER_NORMAL, WALKER_OFFLINE,
    ensureModuleState, laneChip, visitDashboard,
} from './commFailureShared';

// retries: an app visit can intermittently land the stale-document artifact
// (commFailureShared.ts) — a retried test re-navigates from a fresh context.
describe('Comm failure detection when a module is stopped (phase B: reload + recovery)', {retries: 2}, () => {

    it('ensures the Patrol module is stopped and its silence is past the threshold', () => {
        ensureModuleState(PATROL, 'STOPPED');
        // Make the newest stored observation older than LANE_COMMS_STALE_MS so
        // the next test exercises pure load-time reconciliation.
        cy.wait(16000);
    });

    it('reload while down shows Comm Failure without a fresh green window', () => {
        // Cold load with the module long silent: reconcile sees the stale
        // latest observation and must mark the lane offline as soon as it
        // completes (pre-fix it re-asserted green from isConnected:true); the
        // walker seeds directly into the grey style from the REST obs age.
        visitDashboard();
        laneChip(PATROL).find('[data-testid="CloseIcon"]', {timeout: 30000})
            .should('exist');
        cy.get(WALKER_OFFLINE, {timeout: 30000}).should('exist');
    });

    it('starts the Patrol module again', () => {
        ensureModuleState(PATROL, 'STARTED');
    });

    // Separate test on purpose: an admin→app navigation inside one test hits
    // the stale-document artifact described in commFailureShared.ts; a fresh
    // per-test context makes the app boot the first navigation.
    it('dashboard recovers to online once messages resume', () => {
        visitDashboard();
        laneChip(PATROL).find('[data-testid="FavoriteIcon"]', {timeout: 60000})
            .should('exist');
        cy.get(WALKER_NORMAL, {timeout: 60000}).should('exist');
        cy.get(WALKER_OFFLINE).should('not.exist');
    });
});
