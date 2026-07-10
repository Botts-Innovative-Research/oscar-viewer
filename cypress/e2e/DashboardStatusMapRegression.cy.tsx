/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Dashboard regression coverage for two load-time bugs:
//
// 1. Quick View map stuck at the Leaflet world view (zoom 3) because the
//    location datasources were computed once, before lane discovery finished —
//    markers were never created and fitBounds never ran until the component
//    remounted (open+close of the adjudication preview).
// 2. Lane Status frozen after an SPA navigation away and back: the stream
//    registry disconnected MQTT streams when the last widget released them,
//    and osh-js cannot resubscribe after an unsubscribe (MqttProvider keeps
//    the topic in its dedupe list; MqttTopicConnector never recreates its
//    closed BroadcastChannel) — dead until a full page reload.
//
// Run against a same-origin server for the built app that forwards /sensorhub
// to a live node (deployed topology or the verification proxy). The node port
// the app talks to defaults to the proxy's but can be overridden:
//   npx cypress run --spec cypress/e2e/DashboardStatusMapRegression.cy.tsx \
//     --config baseUrl=http://localhost:8090 --env nodePort=8090

const NODE_PORT = Number(Cypress.env('nodePort') || 8090);

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

const ONLINE_ICONS = '[data-testid="FavoriteIcon"], [data-testid="VisibilityIcon"]';

function visitDashboard() {
    cy.visit('/', {
        // Satisfies the node's basic-auth challenge when the app is served by
        // the node itself; harmless through the verification proxy.
        auth: {username: 'admin', password: 'oscar'},
        onBeforeLoad(win) {
            win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
        },
    });
}

/** Wait until at least one Lane Status chip reports online/scanning. */
function assertLaneStatusLive(label: string, timeout: number) {
    cy.get(ONLINE_ICONS, {timeout}).should(($icons) => {
        expect($icons.length, `${label}: online/scanning lane chips`).to.be.greaterThan(0);
    });
}

describe('Dashboard lane status + quick view map', () => {

    it('quick view map creates lane markers and zooms in on a cold load', () => {
        visitDashboard();

        // Lane markers are Leaflet circleMarkers (svg paths). Pre-fix none were
        // ever created on a cold load, so this is the primary regression signal.
        cy.get('#mapcontainer svg path.leaflet-interactive', {timeout: 60000})
            .should('have.length.greaterThan', 0);

        // fitBounds moved the view off the (0,0) zoom-3 world default. Leaflet's
        // zoom-animation proxy carries scale(2^zoom); parse it rather than
        // depending on tile URLs (tiles may not load offline).
        cy.get('#mapcontainer .leaflet-proxy', {timeout: 30000}).should(($el) => {
            const transform = $el[0].style.transform || '';
            const m = transform.match(/scale\(([\d.e+]+)\)/i);
            expect(m, `zoom proxy transform present (got "${transform}")`).to.not.be.null;
            const zoom = Math.log2(parseFloat(m![1]));
            expect(zoom, 'map zoom after fitBounds').to.be.greaterThan(3);
        });
    });

    it('lane status keeps updating after navigating away and back (SPA)', () => {
        visitDashboard();

        // Healthy baseline: chips exist and go live from the realtime streams.
        assertLaneStatusLive('initial load', 60000);

        // SPA-navigate away (releases every dashboard stream handler) and back.
        // Must be client-side navigation: a full reload would reset the broken
        // osh-js module state and mask the bug. trailingSlash renders hrefs
        // with a trailing slash, so match by prefix.
        cy.get('a[href^="/servers"]').first().click();
        cy.url({timeout: 15000}).should('include', '/servers');
        cy.wait(2000); // let the dashboard unmount/release fully propagate

        cy.get('a[href="/"]').first().click();
        cy.url({timeout: 15000}).should('match', /\/(\?.*)?(#.*)?$/);

        // The remounted widget starts at defaults (comm-failure icons) and only
        // leaves them if the resubscribed streams actually deliver. Pre-fix the
        // streams were permanently dead here and the icons never changed.
        assertLaneStatusLive('after navigate away and back', 30000);
    });
});
