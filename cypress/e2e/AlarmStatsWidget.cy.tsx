/**
 * When run against a same-origin verification proxy (CYPRESS_OSCAR_PORT set),
 * seed the node config before app boot so the viewer talks to the proxy rather
 * than auto-deriving a node from window.location. Against a real deployed node
 * this is a no-op and the app's own default-node logic applies.
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

describe('Alarm Statistics Widget (E2E)', () => {

    it('adds the widget, renders a chart, reconfigures it, and persists across reload', () => {
        visitApp('/');

        cy.get('[data-testid="add-page-button"]', {timeout: 10000}).click({force: true});
        cy.get('input').filter(':visible').first().type('Alarm Stats Test');
        cy.contains('button', /create/i).click();

        cy.url().should('include', '/custom-page');

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
