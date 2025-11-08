
describe('Lane View Page (E2E)', () => {
    before(() => {
        cy.visitLaneViewPage();
        cy.intercept('GET', '**/api/**', { log: false });

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


            cy.get('video', {timeout: 10000}).then(($video) => {
                const video = $video[0];
                return new Cypress.Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        expect(video.duration).to.be.greaterThan(0);
                        resolve();
                    };
                });
            }).then(() => {
                const duration = Date.now() - start;
                expect(duration).to.be.lessThan(5000);
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

            cy.get('video', {timeout: 10000}).then(($video) => {
                const video = $video[0];
                return new Cypress.Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        expect(video.duration).to.be.greaterThan(0);
                        resolve();
                    };
                });
            }).then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(3000);
            });
        });
    });
});