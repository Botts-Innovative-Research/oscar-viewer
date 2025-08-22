/**
 *  view details on a non-alarming occupancy
 *
 */
describe('Event Table (FOR NON-ALARMING)', () => {
    beforeEach('Set up', () => {
        cy.visit('/event-log');
    });

    it('table populates < 3 seconds', () => {
        cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);

        // check if table has columns
        cy.get('[data-field="laneId"]').should('be.visible');
        cy.get('[data-field="occupancyId"]').should('be.visible');
        cy.get('[data-field="status"]').should('be.visible');
    });

    it('use a filter on the alarm table', () => {
        cy.get('button[aria-label="Show filters"]').click();

        // add a filter
        cy.get('.MuiDataGrid-filterForm').should('be.visible');

        // filter by status in drop down menu
        cy.get('.MuiDataGrid-filterForm .MuiSelect-select').first().click();
        cy.get('.MuiMenuItem-root').contains('Status').click();

        // set filter to Gamma
        cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
            .clear()
            .type('Gamma');

        // TODO verify only gamma events are displayed in table
        cy.get('');
    });

    it('Select a non-alarming occupancy and navigate to event details', () => {

        // click first row in table that status is None
        cy.get('.MuiDataGrid-row').first()
            .get('[data-field="Status"]').contains('None').click();


        cy.get('.MuiDataGrid-row').first()
            .should('have.class', 'selected-row');

        cy.get('[data-field="Menu"]').click();

        // menu is displayed to navigate to details
        cy.get('.MuiList-root .MuiDataGrid-menulist').first();
        cy.get('.MuiMenuItem-root').contains('Details').click();


        // event details page is opened
    });

});