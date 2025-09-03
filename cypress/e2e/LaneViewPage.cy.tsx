
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

    it.skip('display lane status with only current lane', () => {

    });

    describe('Video', () => {

        it('live video stream plays < 3 seconds', () => {
            const start = Date.now();

            cy.get('img', {timeout: 10000}).should('have.class', 'video-mjpeg').then(() => {
                const duration = Date.now() - start;

                expect(duration).to.be.lessThan(3000);
            });
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

    describe('Tables', () => {
        //toggle tables
    })

});