
describe('Lane View Page (E2E)', () => {
    before(() => {
        cy.visitLaneViewPage();
    });

    describe('Performance Testing', () => {
        it('FE-PERF-007 Load initial alarm data', () => {

            const start = Date.now();

            // status bar
            cy.get('.MuiStack-root', {timeout: 10000})
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            // gamma chart
            cy.get('[id="chart-view-gamma"]', {timeout: 10000})
                .should('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            // neutron chart
            cy.get('[id="chart-view-neutron"]', {timeout: 10000})
                .should('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(3000);
                });

            // occupancy table
            cy.get('.MuiDataGrid-row', {timeout: 10000})
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            //toggle exist
            cy.get('.MuiToggleButtonGroup-root').should('exist').and('be.visible');
        });


        it('FE-PERF-002: Open a  live lane view and video stream appears in < 3 seconds', () => {
            const start = Date.now();

            cy.get('img.video-mjpeg', {timeout: 10000})
                .should('exist').and('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(3000);
                });
        });
    });


    describe('Video', () => {
        it('switch between video streams', () => {

            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible');

            // pause video
            cy.get('button[data-testid="PauseRoundedIcon"]').click();

            // get right arrow and check if disabled if disable only 1 video, else click the button
            cy.get('button[data-testid="NavigateAfterIcon"]').and('not.be.disabled').click();

            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible');
        });
    });

    describe('Tables', () => {
        //toggle tables
    })

});