/// <reference types="cypress" />

// Regression: in-JVM module Restart of the Mobile Detector lane (Patrol 1).
// Before the 2026-08-08 osh-core/rs350 fixes, the first Restart failed with
// "Cannot update the record structure or encoding of a datastream if it already
// has observations" and every retry failed with "A command receiver is already
// connected to systems/urn:osh:system:lane:PATROL1/commands/adjudicationControl/data",
// wedging the module until a full node restart.
//
// Targeting note: the Vaadin module table recycles row DOM on push updates, so a
// resolved <tr> can silently become a different module between query and click.
// The server-side SELECTION is the only stable anchor: select the module first,
// assert the selected row's name cell, then act on tr.v-selected.
describe('Admin UI: lane module restart', () => {
    const ADMIN_URL = 'http://localhost:8282/sensorhub/admin';

    function selectModule(name: string) {
        cy.contains('.v-table-cell-wrapper', new RegExp(`^${name}$`), { timeout: 30000 })
            .click({ force: true });
        // hard proof we selected the right module (fails loudly on a mis-click)
        cy.get('tr.v-selected .v-table-cell-wrapper', { timeout: 10000 })
            .first()
            .should('have.text', name);
    }

    function restartSelectedModule(name: string) {
        cy.get('tr.v-selected').first().rightclick({ force: true });
        cy.contains('.gwt-MenuItem, .v-context-menu *', 'Restart', { timeout: 10000 })
            .click({ force: true });

        // confirmation dialog (if the UI asks)
        cy.wait(500);
        cy.get('body').then(($b) => {
            const win = $b.find('.v-window');
            if (win.length) {
                cy.wrap(win).contains('.v-button', /^(Yes|OK)$/).click({ force: true });
            }
        });

        // selected module must come back to STARTED, with no error notification
        cy.get('tr.v-selected', { timeout: 30000 }).first().should('contain.text', 'STARTED');
        cy.get('tr.v-selected .v-table-cell-wrapper').first().should('have.text', name);
        cy.get('.v-Notification-error, .v-Notification.error').should('not.exist');
    }

    it('restarts the Mobile Detector module twice in a row without errors', () => {
        cy.visit(ADMIN_URL);
        selectModule('Patrol 1');
        restartSelectedModule('Patrol 1');
        cy.wait(3000);
        restartSelectedModule('Patrol 1');
    });
});
