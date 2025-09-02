
describe('Event Details View Page (E2E)', () => {
    before(() => {
        cy.visit('/event-details');
    });

    it('Renders components', () => {
        cy.contains('Event Details').should('be.visible');

        // event data row
        cy.get('.MuiDataGrid-root').should('be.visible');

        // event details table
        // charts
        cy.get('.chart-view-event-detail').should('exist').and('be.visible');


        // video
        cy.get('img').should('have.class', 'video-mjpeg');
        // no video available
        // cy.get('No video data available.').should('be.visible');

        // max table
        cy.get('Max Gamma Count Rate (cps)').should('be.visible');

        // adjudication log
        cy.get('Logged Adjudications').should('be.visible');
        cy.get('.MuiDataGrid-root').contains('[data-field="isotopes"]').should('be.visible');

        // adjudication form
        cy.get('Adjudication Report Form').should('be.visible');
    });

    describe('Charts', () => {
        it('displays chart for selected event', () => {
            cy.get('.chart-view-event-detail').should('exist').and('be.visible');

        });
    });

    describe('Video', () => {
        it('displays video for selected event', () => {
            // video should exist
            cy.get('img').should('have.class', 'video-mjpeg');
        });

        it('switch between video streams', () => {

            cy.get('img').should('have.class', 'video-mjpeg');

            // pause video
            cy.get('button[data-testid="PauseRoundedIcon"]').click();

            // get right arrow and check if disabled if disable only 1 video, else click the button
            cy.get('button[data-testid="NavigateAfterIcon"]').and('not.be.disabled').click();

            cy.get('img').should('have.class', 'video-mjpeg');

        });
    });

    describe('Adjudication ', () => {

        it('Adjudicates alarm and displays on log', () => {

            // select adj test
            cy.get('.MuiSelect-select').contains('Adjudicate').click();
            cy.get('.MuiList-root').should('be.visible');
            cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]').click();

            // select unknown isotope
            cy.get('.MuiSelect-select').contains('Isotope').click();
            cy.get('.MuiList-root').should('be.visible');
            cy.get('[data-value="Unknown"]').click();

            // type in note area
            cy.get('textarea[id="outlined-multiline-static"]').clear().type('Testing notes- ignore');

            // type in vehicle id
            cy.get('input[name="vehicileId"]').clear().type('Test Vehicle');

            //submit adjudication form
            cy.contains('button', 'Submit').click();

            // check log for adjudication

        });

    });
});