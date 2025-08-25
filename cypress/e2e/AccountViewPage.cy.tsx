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

    it('change alarm volume', () => {

        // click notif bell
        cy.get('data-testid=NotificationsRoundedIcon').click();

        // verify the menu appears
        cy.get('.MuiTypography-root').contains('Alarm Volume').should('be.visible');

        // update volume
        // cy.get('input[aria-label="Volume"]').get("value").should('contain.value', 50);
    })
});