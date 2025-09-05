
describe('Map View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/map');
    });

    it.skip('selecting point marker displays popup with lanename, status, and button', () => {
        //todo
        cy.get('[id="mapcontainer"]')
            .should('be.visible');

        // find the pointmarker and click

        // cy.get('').should('exist') //lane name
        // lane status
        // view button
    });

    it.skip('navigate to laneview from pointmarker', () => {
        //todo

        // click the pointmarker and click view lane button

        // click pointmarker
        cy.get('[""]').click();

        // check if popup menu is visible

        // find button to view lane and click it

        // check url to see if navigation occured to lane view
    });
});