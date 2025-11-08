describe('Account View', () => {

    before(() => {
        cy.visit('/');
    });

    describe('Login to client', () => {
        // todo update this with authentication when we add that to the client :D

        it('should login and navigate to dashboard', () => {
            cy.get('input[id="username"]').clear().type('testuser'); //type in input into field
            cy.get('[id="username"').should('have.value', 'testuser'); //verify input was updated

            cy.get('input[id="password"]').clear().type('password123');
            cy.get('[id="password"').should('have.value', 'password123');

            cy.get('button[name="login-btn"]').click();

            cy.url().should('include', '/dashboard');
            // cy.get('[id="volume-snackbar"]')
            //     .should('be.visible')
            //     .and('contain', 'Alarms will trigger audible sound in client');
        });

    });
});