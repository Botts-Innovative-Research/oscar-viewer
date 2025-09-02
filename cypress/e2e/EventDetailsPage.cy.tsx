
describe('Event Details View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/event-details');
    });

    it('Renders components', () => {
        // event details table
        // charts
        // video
        // adjudication log
        // adjudication form
    })

    describe('Charts', () => {
        it('displays chart for selected event', () => {

        });
    });

    describe('Video', () => {
        it('displays video for selected event', () => {

            // video should exist
            // cy.get('')
        });

        it('switch between video streams', () => {

        });
    });

    describe('Adjudication ', () => {

        it('Adjudicates alarm and displays on log', () => {

        });

    });
});