describe('Account View Page (E2E)', () => {
    it('logs in and shows snackbar', () => {
        cy.visit('/');
        cy.get('input[id="username"]').type('testuser');
        cy.get('input[id="password"]').type('password123');
        cy.get('button[name="login-btn"]').click();
        cy.get('[id="volume-snackbar"]')
            .should('be.visible')
            .and('contain', 'Alarms will trigger audible sound in client');
    });
});