
describe('Event Table (FOR NON-ALARMING)', () => {

    before(() => {
        cy.visit('/event-log');
        cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
    });

    //works
    it('table populates < 3 seconds', () => {

        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).should('exist').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(7000); //todo: update to 3000 when we redo the event fetch
        });
    });

    //works
    it.skip('use a filter on the alarm table', () => {

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

        // TODO: verify only gamma events are displayed in table

    });

    //TODO IT CANNOT FIND THE BUTTON FOR THE EVENT DETAILS SO NEED HELP REWORKING THIS TEST TO PASS THIS CASE
    // FE-PERF-005 - View details of a non-alarming occupancy.
    it('Select a non-alarming occupancy and navigate to event details', () => {

        //click first row in table that status is None
        cy.get('.MuiDataGrid-row')
            .filter(':contains("None")')
            .first()
            // .contains('[data-field="status"]', 'None')
            // .closest('.MuiDataGrid-row')
            .click();

        cy.wait(2000);

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

    });

});