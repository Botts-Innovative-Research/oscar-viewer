
describe('National View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/national-view');
    });

    // FE-PERF-003- Load the National View table.
    it('table populates < 3 seconds', () => {
        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).should('have.lengthOf.greaterThan', 0).then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(3000);
        });

        // check if table has columns
        // cy.get('[data-field="site"]').should('be.visible');
        // cy.get('[data-field="occupancyCount"]').should('be.visible');
        // cy.get('[data-field="gammaAlarmCount"]').should('be.visible');
        // cy.get('[data-field="neutronAlarmCount"]').should('be.visible');
        // cy.get('[data-field="faultAlarmCount"]').should('be.visible');
        // cy.get('[data-field="tamperAlarmCount"]').should('be.visible');
    });
});