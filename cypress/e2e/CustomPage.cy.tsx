describe('Custom Widget Pages (E2E)', () => {

    it('creates a custom page, adds a widget, and persists across reload', () => {
        cy.visit('/');

        // Create a page from the nav drawer
        cy.get('[data-testid="add-page-button"]', {timeout: 10000}).click({force: true});
        cy.get('input').filter(':visible').first().type('Cypress Test Page');
        cy.contains('button', /create/i).click();

        cy.url().should('include', '/custom-page/');
        cy.url().should('include', 'id=');

        // Enter edit mode and add a system status widget
        cy.get('[data-testid="edit-mode-toggle"]').click();
        cy.get('[data-testid="add-widget-button"]').click();
        cy.get('[data-testid="add-widget-system-status"]').click();
        cy.get('[data-testid="widget-system-status"]', {timeout: 10000}).should('exist');

        // Lock the layout again
        cy.get('[data-testid="edit-mode-toggle"]').click();

        // Persisted after reload (redux-persist -> localStorage)
        cy.reload();
        cy.get('[data-testid="widget-system-status"]', {timeout: 10000}).should('exist');

        // Page appears in the nav drawer
        cy.contains('Cypress Test Page').should('exist');

        // Clean up: delete the page so reruns start fresh
        cy.get('[data-testid="page-menu-button"]').click();
        cy.contains('li', /delete/i).click();
        cy.url({timeout: 10000}).should('not.include', '/custom-page/');
    });

    it('seeded dashboard renders widget frames', () => {
        cy.visit('/');
        cy.get('[data-testid="widget-system-status"]', {timeout: 10000}).should('exist');
        cy.get('[data-testid="widget-adjudication-table"]', {timeout: 10000}).should('exist');
    });

    it('persists column visibility toggled via the grid column panel', () => {
        cy.visit('/');
        cy.get('[data-testid="widget-adjudication-table"]', {timeout: 10000}).should('exist');
        cy.get('[data-testid="widget-adjudication-table"]')
            .contains('.MuiDataGrid-columnHeaderTitle', 'Max Gamma').should('exist');

        // Hide "Max Gamma" through the grid's own Columns panel
        cy.get('[data-testid="widget-adjudication-table"]').contains('button', /columns/i).click();
        cy.get('.MuiDataGrid-columnsManagement').contains('label', 'Max Gamma').click();
        cy.get('body').type('{esc}');
        cy.get('[data-testid="widget-adjudication-table"]')
            .contains('.MuiDataGrid-columnHeaderTitle', 'Max Gamma').should('not.exist');

        // Must survive a reload (persisted into the widget config)
        cy.reload();
        cy.get('[data-testid="widget-adjudication-table"]', {timeout: 10000}).should('exist');
        cy.get('[data-testid="widget-adjudication-table"]')
            .contains('.MuiDataGrid-columnHeaderTitle', 'Max Gamma').should('not.exist');

        // Clean up: reset the page to defaults restores the column
        cy.get('[data-testid="page-menu-button"]').click();
        cy.contains('li', /reset/i).click();
        cy.get('[data-testid="widget-adjudication-table"]')
            .contains('.MuiDataGrid-columnHeaderTitle', 'Max Gamma', {timeout: 10000}).should('exist');
    });

    it('import/export dialog opens and offers export buttons', () => {
        cy.visit('/');
        cy.get('[data-testid="page-menu-button"]').click();
        cy.contains('li', /import|export/i).click();
        cy.contains('button', /export all/i).should('be.visible');
        cy.contains('button', /choose file/i).should('be.visible');
        cy.contains('button', /close/i).click();
    });
});
