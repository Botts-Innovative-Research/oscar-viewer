
describe('Servers Page (E2E)', () => {
    beforeEach(() => {
        // cy.visit('/servers');
        cy.visitServerPage();
    });

    describe('Adding Nodes', () => {

        it('Should successfully add non-local node to the list of ndoes', () => {
            cy.get('input[name="name"]').clear().type('TEST Non-Local Node');
            cy.get('[name="name"]').should('have.value','TEST Non-Local Node');

            //TODO: put ip addy here
            cy.get('input[name="address"]').clear().type('100.94.197.23');
            cy.get('[name="address"]').should('have.value', '100.94.197.23');

            // TODO: fix NaN when trying to update port reference
            // cy.get('input[name="port"]')
            //     .clear()
            //     .type('8282')
            //     .invoke('val')
            //     .then(Number)
            //     .should('equal', 8282);

            // cy.get('[name="port"]').should('have.value','8282');

            cy.get('input[name="username"]').clear().type('admin');
            cy.get('[name="username"]').should('have.value','admin');

            cy.get('input[name="password"]').clear().type('oscar');
            cy.get('[name="password"]').should('have.value','oscar');

            cy.contains('button','Add Node').click();
            cy.get('[id="saveNode-snackbar"]')
                .should('be.visible')
                .should('match',/Node is reachable | Node is not reachable. Try again./);

            cy.get('[id="saveNode-snackbar"]')
                .should('be.visible')
                .should('match',/OSCAR Configuration Saved | Failed to save OSCAR Configuration./);

        })
    });

    describe('Editing/Removing Nodes', () => {
        it.skip('Edit existing node displays changes in node list', () => {

            cy.contains('button', 'Edit').first().click();

            cy.contains('Edit Node').should('be.visible');

            cy.get('input[name="name"]').clear().type('Testing Node');
            cy.get('input[name="address"]').clear().type('localhost');
            cy.get('input[name="port"]').clear().type('8282');
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

        it.skip('deleting node removes it from the list', () => {

        });

        it.skip('Cancel new node', () => {

            // fill out node form
            cy.get('input[name="name"]').clear().type('Testing Node');
            cy.get('input[name="address"]').clear().type('localhost');
            cy.get('input[name="port"]').clear().type('8282');
            cy.get('input[name="username"]').clear().type('admin');
            cy.get('input[name="password"]').clear().type('oscar');


            cy.contains('button','Cancel').click();
        });
    });

});