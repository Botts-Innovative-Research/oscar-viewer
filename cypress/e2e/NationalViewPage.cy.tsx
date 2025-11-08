
describe('National View Page (E2E)', () => {
    before(() => {
        cy.visitNationalPage();
    });

    it('FE-PERF-003- Load the National View table & table populates in < 3 seconds', () => {
        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).then(($rows) => {
            const selectedRow = $rows.filter('.selected-row');
            if (selectedRow.length === 0) {
                cy.get('.MuiDataGrid-row')
                    .filter(':contains("Local Node")')
                    .first()
                    .click();
            }
        }).then(() => {
            const duration = Date.now() - start;
            expect(duration).to.be.lessThan(3000);
        });

    });

    it.skip('Should get latest stats when clicking refresh button', () => {
        cy.contains('button', 'Refresh Stats')
            .click();
    })

    it.skip('Get custom stat range and click refresh button', () => {
        cy.contains('label', 'Time Range')
            .parent()
            .find('.MuiSelect-select')
            .click()
        // cy.get('.MuiSelect-select').().click();
        cy.get('.MuiList-root').should('be.visible');
        cy.get('[data-value="custom"]')
            .click();

        cy.contains('label', 'Start Date')
            .get('input[placeholder="MM/DD/YYYY hh:mm aa"]')
            .clear().type("01/01/2024 12:00AM")

        cy.contains('label', 'End Date')
            .get('input[placeholder="MM/DD/YYYY hh:mm aa"]')
            .clear().type("01/01/2026 12:00AM")

        cy.contains('button', 'Back').click();
    })
});