
describe('Event Log', () => {
    before(() => {
        cy.visitEventsPage();
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
                .type('Gamma');

            // verify only gamma events are displayed in table
            cy.get('.MuiDataGrid-row').each(($row) => {
                cy.wrap($row).contains('Gamma');
            });
        });

        it('FE-PERF-005 - View details of a non-alarming occupancy.', () => {

            //click first row in table that status is None
            cy.selectNoneEvent();

            cy.get('.MuiDataGrid-row.selected-row')
                .within(() => {
                    cy.get('button[data-testid="MoreVertIcon"]')
                        .closest('button')
                        .click();
                });


            // menu is displayed to navigate to details
            cy.get('.MuiList-root .MuiDataGrid-menulist')
                .should('be.visible');

            cy.get('.MuiMenuItem-root')
                .contains('Details')
                .click();

            // event details page is opened
            cy.url().should('include', '/event-details/');

            // navigate back
            cy.contains('button', 'Back')
                .click();

            cy.url().should('include', '/event-log');

        });
    });

});