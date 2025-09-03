
describe('Lane View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/lane-view');
    });

    it.skip('renders all components', () => {
       // videos
       // charts
       // status bar
       // occupancy table
    });

    it('live video stream plays < 3 seconds', () => {
        const start = Date.now();

        cy.get('img', {timeout: 10000}).should('have.class', 'video-mjpeg').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(3000);
        });
    });

    it.skip('display lane status with only current lane', () => {

    });

});