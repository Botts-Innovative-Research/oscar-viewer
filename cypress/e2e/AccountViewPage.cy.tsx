describe('Account View Page (E2E)', () => {
    it('logs in and shows snackbar', () => {
        cy.visit('/');
        cy.get('[data-testid="username-input"]').type('testuser');
        cy.get('[data-testid="password-input"]').type('password123');
        cy.get('[data-testid="login-button"]').click();
        cy.get('[data-testid="volume-snackbar"]')
            .should('be.visible')
            .and('contain', 'Alarms will trigger audible sound in client');
    });
});