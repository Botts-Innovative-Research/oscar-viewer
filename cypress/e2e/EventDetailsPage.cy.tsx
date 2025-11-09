
describe('Event Details', () => {
    before(() => {
        // visit dashboard page
        cy.visitDashboardPage();

        // select event from alarm table
        cy.selectEventAndExpandDetails();
    });

    describe('Performance Test', () => {
        it('FE-PERF-007 Load initial data', () => {
            const start = Date.now();

            // check datagrid loads
            cy.get('.MuiDataGrid-root', {timeout: 10000})
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });


            cy.get('div.chart-view-event-detail')
                .find('canvas')
                .should('exist')
                .and('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            cy.get('video').then(($video) => {
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
        });
    });

    describe('Page components load', () => {
        it('should display tables', () => {
            cy.contains('Max Gamma Count Rate (cps)')
                .should('be.visible');

            cy.contains('Logged Adjudications')
                .should('be.visible');


        });

        it('should display adjudication report form', () => {
            cy.contains('Adjudication Report Form')
                .should('be.visible');
        });
    })

    describe.skip('Chart Actions', () => {
        it('should display chart for selected event', () => {
            cy.get('div.chart-view-event-detail')
                .find('canvas')
                .should('exist')
                .and('be.visible');

        });
    });

    describe.skip('Video', () => {
        it('should display video stream', () => {
            cy.get('video source')
                .should('exist')
                .and('be.visible')
                .and('have.attr', 'src')
                .and('not.be.empty')
        });

        it('should switch between video streams', () => {

            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible')

        });
    });


    describe("Event Adjudication", () => {
        it('should successfully adjudicate an event', () => {

            // adjudicate
            cy.contains('label', 'Adjudicate')
                .parent()
                .find('.MuiSelect-select')
                .click()
            cy.get('.MuiList-root').should('be.visible');
            cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                .click();

            cy.contains('label', 'Isotope')
                .parent()
                .find('.MuiSelect-select')
                .click()
            cy.get('.MuiList-root').should('be.visible');
            cy.get('[data-value="Unknown"]')
                .click();
            cy.wait(200)
            cy.get('body').type('{esc}');

            //secondary inspection
            cy.contains('label', 'Secondary Inspection')
                .parent()
                .find('.MuiSelect-select')
                .click()
            cy.get('.MuiList-root').should('be.visible');
            cy.get('[data-value="NONE"]')
                .click();

            // type in note area
            cy.get('textarea[id="outlined-multiline-static"]')
                .clear()
                .type('Testing notes- ignore');

            // type in vehicle id
            cy.get('input[name="vehicleId"]')
                .clear()
                .type('Test Vehicle');

            //submit adjudication form
            cy.contains('button', 'Submit')
                .click();

            cy.wait(500);
        });
    });

    describe('Navigate back', () => {
        it('should navigate back to dashboard', () => {
            cy.contains('button', 'Back')
                .click();
            cy.url().should('include', '/');
        });
    });
});