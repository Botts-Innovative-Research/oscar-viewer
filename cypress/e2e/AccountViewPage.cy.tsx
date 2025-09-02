describe('Account View Page (E2E)', () => {
    it('logs in and shows snackbar', () => {
        cy.visit('/');

        cy.get('input[id="username"]').type('testuser'); //type in input into field
        cy.get('[id="username"').should('have.value', 'testuser'); //verify input was updated

        cy.get('input[id="password"]').type('password123');
        cy.get('[id="password"').should('have.value', 'password123');

        cy.get('button[name="login-btn"]').click();

        cy.get('[id="volume-snackbar"]')
            .should('be.visible')
            .and('contain', 'Alarms will trigger audible sound in client');
    });
});