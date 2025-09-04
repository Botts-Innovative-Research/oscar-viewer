/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }



Cypress.Commands.add('selectRapiscanEvent', () => {
    cy.get('.MuiDataGrid-row').then(($rows) => {
        const selectedRow = $rows.filter('.selected-row');
        if (selectedRow.length === 0) {
            cy.get('.MuiDataGrid-row')
                .contains('[data-field="laneId"]', 'Rapiscan')
                .closest('.MuiDataGrid-row')
                .click();
        }
    });
});

Cypress.Commands.add('selectNoneEvent', () => {
    cy.get('.MuiDataGrid-row').then(($rows) => {
        const selectedRow = $rows.filter('.selected-row');
        if (selectedRow.length === 0) {
            cy.get('.MuiDataGrid-row')
                .filter(':contains("None")')
                .first()
                // .contains('[data-field="status"]', 'None')
                // .closest('.MuiDataGrid-row')
                .click();
        }
    });
});

Cypress.Commands.add('selectAspectEvent', () => {
    cy.get('.MuiDataGrid-row').then(($rows) => {
        const selectedRow = $rows.filter('.selected-row');
        if (selectedRow.length === 0) {
            cy.get('.MuiDataGrid-row')
                .filter(':contains("Aspect")')
                .first()
                // .contains('[data-field="laneId"]', 'Aspect')
                // .closest('.MuiDataGrid-row')
                .click();
        }
    });
});

Cypress.Commands.add('selectEventAndExpandDetails', () => {
    cy.selectRapiscanEvent();

    cy.get('button[aria-label="expand"]').click(); //click expand button

    cy.url().should('include', '/event-details'); // check url contains event-details now

    cy.contains('Event Details').should('be.visible');
});

Cypress.Commands.add('visitDashboardPage', () => {
    cy.get('[data-testid="DashboardRoundedIcon"]').click();

    cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('visitNationalPage', () => {
    cy.get('[data-testid="MediationIcon"]').click();

    cy.url().should('include', '/national-view');

    cy.contains('National View:')
        .should('be.visible');
});

Cypress.Commands.add('visitMapPage', () => {
    cy.get('[data-testid="LocationOnRoundedIcon"]').click();
    cy.url().should('include', '/map/');
});

Cypress.Commands.add('visitAccountPage', () => {
    cy.get('[data-testid="AccountCircleRoundedIcon"]').click();

    cy.url().should('include', '/');
});

Cypress.Commands.add('visitEventsPage', () => {
    cy.get('[data-testid="WarningRoundedIcon"]').click();

    cy.url().should('include', '/event-log');

    cy.contains('Event Log:')
        .should('be.visible');
});

Cypress.Commands.add('visitConfigPage', () => {
    cy.get('[data-testid="SaveRoundedIcon"]').click();

    cy.url().should('include', '/savestate/');
});

Cypress.Commands.add('visitServerPage', () => {
    cy.get('[data-testid="CloudRoundedIcon"]').click();

    cy.url().should('include', '/servers/');
});

Cypress.Commands.add('visitLaneViewPage', () => {
    cy.visitDashboardPage();

    cy.get('[data-testid="CheckCircleIcon"]')
        .should('be.visible')
        .click();

    cy.get('[aria-label="Rapiscan"]')
        .should('be.visible').first()
        .click();

    cy.url().should('include', '/lane-view/');

    cy.contain('Lane View: ').should('be.visible');
});






