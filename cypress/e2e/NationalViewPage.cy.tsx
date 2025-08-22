/**
 *
 * FE-PERF-003- Load the National View table.
 * The table fully populates with data in < 3 seconds.
 *
 */
describe('National View Page (E2E)', () => {
    beforeEach('Set up', () => {
        cy.visit('/national-view');
    });


    it('table populates < 3 seconds', () => {
        cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);

        // check if table has columns
        cy.get('[data-field="site"]').should('be.visible');
        cy.get('[data-field="occupancyCount"]').should('be.visible');
        cy.get('[data-field="gammaAlarmCount"]').should('be.visible');
        cy.get('[data-field="neutronAlarmCount"]').should('be.visible');
        cy.get('[data-field="faultAlarmCount"]').should('be.visible');
        cy.get('[data-field="tamperAlarmCount"]').should('be.visible');
    });


});