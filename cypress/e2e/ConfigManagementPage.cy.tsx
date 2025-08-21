/**
 *
 *
 */
describe('Site Config Management Page (E2E)', () => {
    beforeEach('', () => {
        cy.visit('/savestate');
    });

    it('shows alert and saves configuration on confirm', () => {
        //save config
        cy.contains('button','Save').first().click();

        // alert is visible
        cy.contains('Please Confirm').should('be.visible');
        cy.contains('Are you sure you want to save the configuration (and overwrite the previous one)?').should('be.visible');

        cy.contains('button','Save').last().click();


        cy.get('[id="save-snackbar"]')
            .should('be.visible')
            .and(/OSCAR Configuration Saved | Failed to save/);
    });

    it('cancels the alert when cancel is clicked', () => {
        // click the first dave button to trigger alert
        cy.contains('button','Save').first().click();

        // alert shows
        cy.contains('Please Confirm').should('be.visible');
        cy.contains('Are you sure you want to save the configuration (and overwrite the previous one)?').should('be.visible');

        // click cancel
        cy.contains('button','Cancel').click();

        // alert is removed from screen
        cy.contains('Please Confirm').should('not.exist');

    });

    it('Load config and shows snackbar', () => {
        //load config options
        cy.get('input[name="address"]').clear().type('localhost');
        cy.get('input[name="port"]').clear().type(8282);
        cy.get('input[name="sosEndpoint"]').clear().type('/sos');
        cy.get('input[name="csAPIEndpoint"]').clear().type('/api');
        cy.get('input[name="username"]').clear().type('admin');
        cy.get('input[name="password"]').clear().type('oscar');

        cy.contains('Load State').click();

        // confirm loading
        cy.contains('Are you sure you want to load the configuration (and overwrite the previous one)?');
        cy.contains('Yes').click();

        cy.get('[id="load-snackbar"]')
            .should('be.visible')
            .and(/OSCAR State Loaded | Failed to load/);

    });

    it('Save and load config', () => {

        cy.contains('Save and Load').click();

        // confirm saving
        cy.contains('Please Confirm');
        cy.contains('Save').click();


        // saved state snackbar
        cy.get('[id="save-snackbar"]')
            .should('be.visible')
            .and(/OSCAR Configuration Saved | Failed to save/);


        cy.wait(5000);

        // this is loading state snackbar
        cy.get('[id="load-snackbar"]')
            .should('be.visible')
            .contains(/OSCAR State Loaded|Failed to load/);
    });

});