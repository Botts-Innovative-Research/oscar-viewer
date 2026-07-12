/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Persistence coverage for the Lane Status widget (laneStatusSlice):
//
// 1. A latched gamma alarm survives reload/rehydrate, is NOT cleared by the
//    on-load reconciliation pass (it is a client-only latch), and only clears
//    via the Silence Alarm dialog — after which the silence itself persists
//    across a reload.
// 2. A stale persisted fault (seeded as if the device faulted before the tab
//    closed) is cleared once the app learns the device's real state — via the
//    on-load reconciliation query and/or the live stream reporting a non-fault
//    alarmState. The persisted store must converge to gammaFault=false.
//
// Also regression-covers the ensureLanes prune bug: before the fix, the lane
// seeding effect ran with an empty lane list during discovery and wiped every
// persisted entry, so the seeded alarm below would never render.
//
// Run against a same-origin server for the built app (deployed topology or the
// verification proxy):
//   npx cypress run --spec cypress/e2e/DashboardStatusPersistence.cy.tsx \
//     --config baseUrl=http://localhost:8282 --env nodePort=8282

const NODE_PORT = Number(Cypress.env('nodePort') || 8090);
const LANE = Cypress.env('laneName') || 'AFM Gate';

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

const GAMMA_ALARM_ICON = '[data-testid="FlareIcon"]';
const FAULT_ICON = '[data-testid="ErrorIcon"]';
const ONLINE_ICONS = '[data-testid="FavoriteIcon"], [data-testid="VisibilityIcon"]';

/** Build a persist:root payload seeding one lane's status entry. */
function seedPersistedStatus(entry: Record<string, unknown>) {
    return JSON.stringify({
        laneStatusSlice: JSON.stringify({
            schemaVersion: 1,
            lanes: {
                [LANE]: {
                    parentNode: '',
                    isOnline: true,
                    isTamper: false,
                    gammaFault: false,
                    neutronFault: false,
                    isGammaAlarm: false,
                    isNeutronAlarm: false,
                    isScanning: false,
                    ...entry,
                },
            },
        }),
        _persist: JSON.stringify({version: 1, rehydrated: true}),
    });
}

function visitDashboard(persistRoot?: string) {
    cy.visit('/', {
        auth: {username: 'admin', password: 'oscar'},
        onBeforeLoad(win) {
            win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
            if (persistRoot !== undefined) {
                win.localStorage.setItem('persist:root', persistRoot);
            }
        },
    });
}

/** Read the current persisted laneStatusSlice entry for LANE (or null). */
function readPersistedLane(win: Cypress.AUTWindow): any | null {
    const root = win.localStorage.getItem('persist:root');
    if (!root) return null;
    const slice = JSON.parse(root)['laneStatusSlice'];
    if (!slice) return null;
    return JSON.parse(slice)?.lanes?.[LANE] ?? null;
}

describe('Lane status persistence (laneStatusSlice)', () => {

    it('persisted gamma alarm survives reload + reconciliation, silence persists', () => {
        visitDashboard(seedPersistedStatus({isGammaAlarm: true}));

        // The seeded alarm must render once lane discovery completes. With the
        // pre-fix prune bug this never appears (entry wiped during discovery).
        cy.get(GAMMA_ALARM_ICON, {timeout: 60000}).should('exist');

        // Give the on-load reconciliation pass time to run against the node,
        // then confirm it did NOT clear the client-only alarm latch — in the
        // DOM and in the persisted store.
        cy.wait(10000);
        cy.get(GAMMA_ALARM_ICON).should('exist');
        cy.window().should((win) => {
            const lane = readPersistedLane(win);
            expect(lane, 'persisted lane entry').to.not.be.null;
            expect(lane.isGammaAlarm, 'persisted isGammaAlarm after reconciliation').to.be.true;
        });

        // Silence via the ack dialog.
        cy.contains(LANE).click();
        cy.contains('Active Alarm', {timeout: 10000}).should('be.visible');
        cy.contains('button', 'Silence Alarm').click();
        cy.get(GAMMA_ALARM_ICON).should('not.exist');

        // The silence must persist: reload and confirm the alarm stays gone
        // while the widget itself is live again.
        cy.wait(2000); // let redux-persist flush the write
        cy.reload();
        cy.get(ONLINE_ICONS, {timeout: 60000}).should('exist');
        cy.wait(5000);
        cy.get(GAMMA_ALARM_ICON).should('not.exist');
        cy.window().should((win) => {
            const lane = readPersistedLane(win);
            expect(lane, 'persisted lane entry').to.not.be.null;
            expect(lane.isGammaAlarm, 'persisted isGammaAlarm after silence+reload').to.be.false;
        });
    });

    it('stale persisted gamma fault clears once the device reports non-fault', () => {
        visitDashboard(seedPersistedStatus({gammaFault: true}));

        // Wait for the widget to come live, then require convergence: the
        // device is actually healthy (sim reports Background), so both the
        // rendered chip and the persisted store must drop the stale fault.
        cy.get(ONLINE_ICONS, {timeout: 60000}).should('exist');
        cy.get(FAULT_ICON, {timeout: 30000}).should('not.exist');
        cy.window({timeout: 30000}).should((win) => {
            const lane = readPersistedLane(win);
            expect(lane, 'persisted lane entry').to.not.be.null;
            expect(lane.gammaFault, 'persisted gammaFault after reconciliation').to.be.false;
        });
    });
});
