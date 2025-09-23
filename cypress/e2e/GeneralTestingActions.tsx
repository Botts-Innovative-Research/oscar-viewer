describe('General', () => {

    describe('Navigation Testing', () => {
        // test navbar navigates to correct pages

        it('should navigate to dashboard page', () => {

        });

        it('should navigate to events page', () => {

        });

        it('should navigate to map page', () => {

        });

        it('should navigate to national page', () => {

        });

        it('should navigate to account page', () => {

        });

        it('should navigate to servers page', () => {

        });

        it('should navigate to config management page', () => {

        });
    });


    describe('Other testing', () => {
        it('should change alarm volume', () => {
            // click notif bell
            cy.get('data-testid=NotificationsRoundedIcon').click();

            // verify the menu appears
            cy.get('.MuiTypography-root').contains('Alarm Volume').should('be.visible');

            // update volume
            // cy.get('input[aria-label="Volume"]').get("value").should('contain.value', 50);
        })
    })


});