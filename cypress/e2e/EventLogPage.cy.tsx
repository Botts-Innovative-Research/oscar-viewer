
describe('Event Log', () => {
    before(() => {
        cy.visitEventsPage();
        cy.intercept('GET', '**/api/**', { log: false });
    });

    describe('Performance Testing', () => {
        it('FE-PERF-007 Load initial data', () => {
            const start = Date.now();
            cy.get('.MuiDataGrid-row', {timeout: 10000})
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(3000);
                });
        });

        it('FE-PERF-005 - View details of a non-alarming occupancy.', () => {
            // this may fail but i have seen it pass on occasion, need to work on this one
            cy.selectNoneEvent();

            cy.wait(500);

            cy.get('.MuiDataGrid-row.selected-row', { timeout: 10000 })
                .find('[data-field="Menu"] button[aria-label="more"]')
                .should('exist')
                .click({force: true});


            cy.get('body .MuiMenuItem-root')
                .contains('Details')
                .should('be.visible')
                .click({ force: true });

            cy.url().should('include', '/event-details');
            cy.wait(2000);
            cy.contains('button', 'Back').click();
            cy.url().should('include', '/event-log');
        });

        it('FE-PERF-004 - Apply Filter to the past alarms view', () => {

            // open filter options by clicking filters
            cy.get('button[aria-label="Show filters"]').click();

            // check if filter form is open
            cy.get('.MuiDataGrid-filterForm').should('be.visible');

            // select column to filter by status
            cy.get('.MuiDataGrid-filterForm .MuiSelect-select').filter(':visible').eq(0).click();
            cy.get('.MuiList-root .MuiMenuItem-root').contains('Status').click();

            cy.get('.MuiDataGrid-filterForm .MuiSelect-select').filter(':visible').eq(1).click();
            cy.get('.MuiList-root .MuiMenuItem-root').contains('equals').click();

            // set filter to Gamma
            cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
                .clear()
                .type('Gamma{enter}');

            // verify only gamma events are displayed in table
            cy.get('.MuiDataGrid-row').contains('Gamma');

            cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
                .clear();

        });

        // afterEach(() => {
        //     // remove filter and reset
        // })
    });

});