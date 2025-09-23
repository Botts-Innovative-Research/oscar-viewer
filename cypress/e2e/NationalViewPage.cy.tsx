
describe('National View Page (E2E)', () => {
    before(() => {
        cy.visitNationalPage();
    });
    // cy.get('[data-field="site"]').should('be.visible');
     // cy.get('[data-field="occupancyCount"]').should('be.visible');
     // cy.get('[data-field="gammaAlarmCount"]').should('be.visible');
     // cy.get('[data-field="neutronAlarmCount"]').should('be.visible');
     // cy.get('[data-field="faultAlarmCount"]').should('be.visible');
     // cy.get('[data-field="tamperAlarmCount"]').should('be.visible');

    it('FE-PERF-003- Load the National View table & table populates in <3 seconds', () => {
        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000})
            .should('have.lengthOf.greaterThan', 0)
            .then(() => {
                const duration = Date.now() - start;
                expect(duration).to.be.lessThan(3000);
            });
    });
});