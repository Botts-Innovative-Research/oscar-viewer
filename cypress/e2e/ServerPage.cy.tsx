
describe('Servers Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/servers');
    });

    it.skip('Edit existing node displays changes in node list', () => {

        cy.contains('button', 'Edit').first().click();

        cy.contains('Edit Node').should('be.visible');

        cy.get('input[name="name"]').clear().type('Testing Node');
        cy.get('input[name="address"]').clear().type('localhost');
        cy.get('input[name="port"]').clear().type('8282');
        cy.get('input[name="sosEndpoint"]').clear().type('/sos');
        cy.get('input[name="csAPIEndpoint"]').clear().type('/api');
        cy.get('input[name="configsEndpoint"]').clear().type('/configs');
        cy.get('input[name="username"]').clear().type('admin');
        cy.get('input[name="password"]').clear().type('oscar');


        cy.contains('button','Save Changes').click();


        cy.get('[id="saveNode-snackbar"]')
            .should('be.visible')
            .should('match',/Node is reachable | Node is not reachable. Try again./);


        cy.get('[id="saveNode-snackbar"]')
            .should('be.visible')
            .should('match',/OSCAR Configuration Saved | Failed to save OSCAR Configuration./);
    });

    it('Add new node', () => {

        cy.contains('Add a New Server').should('be.visible')

        // fill out node form
        cy.get('input[name="name"]').clear().type('Testing Node');
        cy.get('input[name="address"]').clear().type('localhost');
        cy.get('input[name="port"]').clear().type('8282');
        cy.get('input[name="sosEndpoint"]').clear().type('/sos');
        cy.get('input[name="csAPIEndpoint"]').clear().type('/api');
        cy.get('input[name="configsEndpoint"]').clear().type('/configs');
        cy.get('input[name="username"]').clear().type('admin');
        cy.get('input[name="password"]').clear().type('oscar');


        cy.contains('button','Add Node').click();

        cy.get('[id="saveNode-snackbar"]')
            .should('be.visible')
            .should('match',/Node is reachable | Node is not reachable. Try again./);


        cy.get('[id="saveNode-snackbar"]')
            .should('be.visible')
            .should('match',/OSCAR Configuration Saved | Failed to save OSCAR Configuration./);


        // todo:
        // find the new node name on the list of nodes on the page!!!!

    });

    it('deleting node removes it from the list', () => {

    });

    // it('Cancel new node', () => {
    //
    //     // fill out node form
    //     cy.get('input[name="name"]').clear().type('Testing Node');
    //     cy.get('input[name="address"]').clear().type('localhost');
    //     cy.get('input[name="port"]').clear().type(8282);
    //     cy.get('input[name="sosEndpoint"]').clear().type('/sos');
    //     cy.get('input[name="csAPIEndpoint"]').clear().type('/api');
    //     cy.get('input[name="configsEndpoint"]').clear().type('/configs');
    //     cy.get('input[name="username"]').clear().type('admin');
    //     cy.get('input[name="password"]').clear().type('oscar');
    //
    //
    //     cy.contains('button','Cancel').click();
    // });

});