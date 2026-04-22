/// <reference types="cypress" />

// Automatically inject basic auth credentials on every visit
Cypress.Commands.overwrite('visit', (originalFn, url, options: any = {}) => {
    return originalFn(url, {
        auth: { username: 'admin', password: 'oscar' },
        ...options,
    });
});


Cypress.Commands.add('selectRapiscanEvent', () => {
    // Deselect first if a row is already selected (to avoid toggling off),
    // then select the first row fresh and wait for the EventPreview to open.
    cy.get('.MuiDataGrid-row').first().then(($row) => {
        if ($row.hasClass('selected-row')) {
            cy.get('.MuiDataGrid-row').first().click(); // deselect
        }
    });
    cy.get('.MuiDataGrid-row').first().click();
    cy.contains('Occupancy ID:', { timeout: 8000 }).should('be.visible');
});

Cypress.Commands.add('selectNoneEvent', () => {
    cy.get('.MuiDataGrid-row').then(($rows) => {
        const selectedRow = $rows.filter('.selected-row');
        if (selectedRow.length === 0) {
            cy.get('.MuiDataGrid-row')
                .filter(':contains("None")')
                .first()
                .click();
        }
    });
});

Cypress.Commands.add('selectAspectEvent', () => {
    cy.get('.MuiDataGrid-row').then(($rows) => {
        const selectedRow = $rows.filter('.selected-row');
        if (selectedRow.length === 0) {
            cy.get('.MuiDataGrid-row')
                .filter(':contains("Aspect Lane")')
                .first()
                .click();
        }
    });
});

Cypress.Commands.add('selectEventAndExpandDetails', () => {
    cy.selectRapiscanEvent();

    cy.get('button[aria-label="expand"]').click();

    cy.url().should('include', '/event-details');

    cy.contains('Event Details').should('be.visible');
});

// Navigation commands use direct URL visits — MUI icon data-testid attributes are
// stripped in production Next.js builds, making icon-click navigation unreliable.

Cypress.Commands.add('visitDashboardPage', () => {
    cy.visit('/');
    cy.url().should('include', '/');
});

Cypress.Commands.add('visitNationalPage', () => {
    cy.visit('/national-view');
    cy.url().should('include', '/national-view');
    cy.contains('National').should('be.visible');
});

Cypress.Commands.add('visitMapPage', () => {
    cy.visit('/map');
    cy.url().should('include', '/map');
});

Cypress.Commands.add('visitEventsPage', () => {
    cy.visit('/event-log');
    cy.url().should('include', '/event-log');
});

Cypress.Commands.add('visitServerPage', () => {
    cy.visit('/servers');
    cy.url().should('include', '/servers');
});

Cypress.Commands.add('visitLaneViewPage', () => {
    cy.visit('/');
    // Click the first available lane status item in the Lane Status section
    cy.contains('h6', 'Lane Status')
        .closest('[class*="MuiStack"]')
        .find('.MuiPaper-root', { timeout: 15000 })
        .first()
        .should('be.visible')
        .click();

    cy.url().should('include', '/lane-view');
    cy.contains('Lane ID').should('be.visible');
});

Cypress.Commands.add('visitReportPage', () => {
    cy.visit('/report');
    cy.url().should('include', '/report');
    cy.contains('Report Generator').should('be.visible');
});
