/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Shared helpers for the comm-failure e2e specs (CommFailureDetection +
// CommFailureRecovery). Not a spec itself — the .cy. specPattern skips it.
//
// Environment notes that shaped these specs:
// - The admin UI is driven THROUGH the verification proxy
//   (/sensorhub/admin) so every visit stays on one origin.
// - Run each spec in its OWN cypress invocation with testIsolation=true and
//   at most TWO app boots per invocation: in this headless-electron setup the
//   third-and-later app document loads can arrive stale (they render the
//   node's deployed old-build viewer instead of the proxy's fresh export —
//   visible as "Uncaught SyntaxError: Unexpected token '<'" chunk failures
//   and a blank page). First and second app boots have been reliable across
//   every observed run.

export const NODE_PORT = Number(Cypress.env('nodePort') || 8090);
export const ADMIN_URL = '/sensorhub/admin';
export const PATROL = 'Patrol 1';

// 127.0.0.1, NOT localhost: cypress tracks remote-state per superdomain, and
// on the shared 'localhost' superdomain a document request can get routed to
// the node upstream (which SPA-serves its DEPLOYED old-build viewer for any
// path) even for a never-seen URL. '127.0.0.1' is a separate superdomain to
// cypress, so the harness keeps exactly one upstream. Run with
// --config baseUrl=http://127.0.0.1:8090 to match.
export const LOCAL_NODE = [{
    name: 'cypress-local',
    address: '127.0.0.1',
    port: NODE_PORT,
    oshPathRoot: '/sensorhub',
    csAPIEndpoint: '/api',
    bucketsEndpoint: '/buckets',
    auth: {username: 'admin', password: 'oscar'},
    isSecure: false,
    isDefaultNode: true,
}];

export const ONLINE_ICONS = '[data-testid="FavoriteIcon"], [data-testid="VisibilityIcon"]';
// Walker divIcon carries the lane name in its title attr; offline appends
// "— no data since HH:MM:SS" and swaps the ring/glyph color to grey.
export const WALKER_NORMAL = `.mobile-unit-marker div[title="${PATROL}"][style*="1565c0"]`;
export const WALKER_OFFLINE = `.mobile-unit-marker div[title^="${PATROL}"][title*="no data since"]`;

export function visitDashboard() {
    // Unique query string per visit: some layer in this headless-electron
    // setup re-serves a stale document for a repeated URL (see header note);
    // a never-before-seen URL forces a fresh fetch. The dashboard reads no
    // query params, so this is invisible to the app.
    cy.visit(`/?cb=${Date.now()}`, {
        onBeforeLoad(win) {
            win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
        },
    });
}

/**
 * The Lane Status chip Paper for one lane. Anchored on the chip's exact-text
 * Typography (<p>) and its nearest Paper: contains('.MuiPaper-root', name)
 * would match the whole widget card (also a Paper) and make icon assertions
 * lane-unspecific.
 */
export function laneChip(name: string) {
    return cy.contains('p', new RegExp(`^${name}$`), {timeout: 60000})
        .closest('.MuiPaper-root');
}

// ---- Vaadin admin helpers (pattern from AdminModuleRestart.cy.ts: row DOM is
// recycled on push updates, so anchor every action on the server-side
// selection, never on a previously resolved <tr>) ----

export function selectModule(name: string) {
    cy.contains('.v-table-cell-wrapper', new RegExp(`^${name}$`), {timeout: 30000})
        .click({force: true});
    cy.get('tr.v-selected .v-table-cell-wrapper', {timeout: 10000})
        .first()
        .should('have.text', name);
}

export function moduleAction(name: string, action: 'Start' | 'Stop', expectState: string) {
    cy.get('tr.v-selected').first().rightclick({force: true});
    // Anchored regex: 'Restart' contains 'Start', so a substring match could
    // hit the wrong menu item.
    cy.contains('.gwt-MenuItem, .v-context-menu *', new RegExp(`^\\s*${action}\\s*$`), {timeout: 10000})
        .click({force: true});

    // confirmation dialog (if the UI asks)
    cy.wait(500);
    cy.get('body').then(($b) => {
        const win = $b.find('.v-window');
        if (win.length) {
            cy.wrap(win).contains('.v-button', /^(Yes|OK)$/).click({force: true});
        }
    });

    cy.get('tr.v-selected', {timeout: 30000}).first().should('contain.text', expectState);
    cy.get('tr.v-selected .v-table-cell-wrapper').first().should('have.text', name);
    cy.get('.v-Notification-error, .v-Notification.error').should('not.exist');
}

/** Idempotently drive the module to STARTED/STOPPED via the admin UI. */
export function ensureModuleState(name: string, want: 'STARTED' | 'STOPPED') {
    cy.visit(ADMIN_URL);
    selectModule(name);
    cy.get('tr.v-selected').first().then(($tr) => {
        if (!$tr.text().includes(want)) {
            moduleAction(name, want === 'STARTED' ? 'Start' : 'Stop', want);
        }
    });
}
