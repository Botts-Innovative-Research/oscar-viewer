/**
 * When run against a same-origin verification proxy (CYPRESS_OSCAR_PORT set),
 * seed the node config before app boot so the viewer talks to the proxy rather
 * than auto-deriving a node from window.location. Against a real deployed node
 * this is a no-op and the app's own default-node logic applies.
 *
 *   STATIC_ROOT=web PORT=8090 node serve-proxy.js
 *   npx cypress run --spec cypress/e2e/AlarmStatsWidget.cy.tsx \
 *     --config baseUrl=http://localhost:8090 --env OSCAR_PORT=8090
 */
const OSCAR_PORT = Cypress.env('OSCAR_PORT');

function visitApp(url: string) {
    cy.visit(url, {
        onBeforeLoad(win) {
            if (!OSCAR_PORT) return;
            win.localStorage.setItem('osh_nodes', JSON.stringify([{
                name: 'Local OSCAR',
                address: 'localhost',
                port: Number(OSCAR_PORT),
                oshPathRoot: '/sensorhub',
                csAPIEndpoint: '/api',
                bucketsEndpoint: '/buckets',
                auth: {username: 'admin', password: 'oscar'},
                isSecure: false,
                isDefaultNode: true,
            }]));
        },
    });
}

/**
 * Deterministic "seed burst has drained" gate. Call BEFORE visitApp (it
 * registers an intercept), then invoke the returned function where the test
 * needs the app quiet.
 *
 * Why: on load the dashboard seeds itself over REST — datastream schemas and
 * observations, plus the adjudication seed (COMPLETED command statuses per
 * lane, paged at limit=1000). For a few seconds that burst occupies all six
 * HTTP/1.1 connections the browser allows per origin. A router.push() issued
 * mid-burst (the create-page dialog) cannot fetch the /custom-page route chunk
 * until a socket frees — nothing prefetches that chunk while no custom page
 * exists — so the URL assertion used to time out at its default 4s. The
 * failure screenshot shows exactly six in-flight /sensorhub/api fetches at the
 * moment the URL check gave up.
 *
 * "Settled" = the adjudication seed has started (so this can't pass in the
 * lull before lane discovery kicks it off) AND no API request is in flight AND
 * none started or finished for QUIET_MS. Live MQTT traffic can trigger small
 * follow-up fetches; those are one-or-two-request blips that merely extend the
 * quiet window, while the seeds themselves are bounded, so this terminates.
 */
function trackApiSettle() {
    const QUIET_MS = 1500;
    const api = {inflight: 0, adjStatusSeen: 0, lastActivityAt: 0};
    cy.intercept('GET', '**/sensorhub/api/**', (req) => {
        api.inflight += 1;
        api.lastActivityAt = Date.now();
        if (/\/controlstreams\/[^/]+\/status/.test(req.url)) api.adjStatusSeen += 1;
        req.continue(() => {
            api.inflight -= 1;
            api.lastActivityAt = Date.now();
        });
    });
    return () => {
        cy.wrap(api, {log: false, timeout: 45000}).should((a) => {
            expect(a.adjStatusSeen, 'adjudication status fetches started').to.be.greaterThan(0);
            expect(a.inflight, 'API requests in flight').to.eq(0);
            expect(Date.now() - a.lastActivityAt, 'ms since last API activity').to.be.greaterThan(QUIET_MS);
        });
    };
}

describe('Alarm Statistics Widget (E2E)', () => {

    it('adds the widget, renders a chart, reconfigures it, and persists across reload', () => {
        const settled = trackApiSettle();
        visitApp('/');

        // Do not drive the create-page dialog while the dashboard's seed burst
        // is saturating the connection pool — see trackApiSettle.
        settled();

        cy.get('[data-testid="add-page-button"]', {timeout: 10000}).click({force: true});
        // Scope to the dialog: the page behind it grows/loses inputs as data
        // lands, so "first visible input on the page" is not stable.
        cy.get('[role="dialog"]', {timeout: 10000})
            .find('input').filter(':visible').first().type('Alarm Stats Test');
        cy.get('[role="dialog"]').contains('button', /create/i).click();

        // First navigation to /custom-page fetches its route chunk on demand;
        // give it headroom beyond the default 4s in case a live-data blip is
        // holding sockets when the click lands.
        cy.url({timeout: 15000}).should('include', '/custom-page');

        cy.get('[data-testid="edit-mode-toggle"]').click();
        cy.get('[data-testid="add-widget-button"]').click();
        cy.get('[data-testid="add-widget-alarm-stats"]').click();
        cy.get('[data-testid="widget-alarm-stats"]', {timeout: 10000}).should('exist');

        // Default visualization is the rate trend: seeded from REST, so give the
        // paginated fetch room before asserting the canvas exists.
        cy.get('[data-testid="widget-alarm-stats"] canvas', {timeout: 30000})
            .should('exist')
            .and('be.visible');

        // Switch to lane comparison through the widget settings dialog.
        // Selected by the tooltip's aria-label, not the MUI icon data-testid:
        // those are stripped from production Next.js builds.
        cy.get('[data-testid="widget-alarm-stats"]')
            .find('[aria-label="Widget settings"]').first().click({force: true});
        cy.contains('label', /visualization/i).parent().find('[role="combobox"]').click();
        cy.contains('li', /lane comparison/i).click();
        cy.contains('button', /save/i).click();

        // Lane comparison shows the KPI strip (occupancies / alarm rate / adjudicated / mean adj time).
        // The timeout goes on contains(), not on the parent get(): a child command
        // uses the default 4s regardless of the parent's timeout, and this view
        // waits on the adjudication status fetch, which is seconds at real volume.
        cy.get('[data-testid="widget-alarm-stats"]')
            .contains(/alarm rate/i, {timeout: 60000}).should('exist');

        cy.get('[data-testid="edit-mode-toggle"]').click();

        // Config must survive a reload (redux-persist -> localStorage)
        cy.reload();
        cy.get('[data-testid="widget-alarm-stats"]', {timeout: 30000}).should('exist');
        cy.get('[data-testid="widget-alarm-stats"]')
            .contains(/alarm rate/i, {timeout: 60000}).should('exist');

        cy.get('[data-testid="page-menu-button"]').click();
        cy.contains('li', /delete/i).click();
        cy.url({timeout: 10000}).should('not.include', '/custom-page');
    });

    it('leaves the seeded pages intact after the new widget type is introduced', () => {
        // Regression guard for KNOWN_WIDGET_TYPES / buildDefaultWidgetConfig:
        // an unknown widget type makes validatePageConfig drop the whole page
        // on rehydrate, silently deleting seeded dashboards.
        visitApp('/');
        cy.get('[data-testid="widget-system-status"]', {timeout: 15000}).should('exist');
        cy.get('[data-testid="widget-adjudication-table"]', {timeout: 15000}).should('exist');
    });
});
