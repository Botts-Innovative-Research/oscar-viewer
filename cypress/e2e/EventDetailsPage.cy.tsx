
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

            // check chart loads
            cy.get('.chart-view-event-detail', {timeout: 10000})
                .should('exist')
                .and('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            //check video stream loads
            cy.get('img.video-mjpeg', {timeout: 10000})
                .should('exist')
                .and('be.visible')
                .then(() => {
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

            cy.get('.MuiDataGrid-root')
                .find('[data-field="isotopes"]')
                .should('be.visible');

        });

        it('should display adjudication report form', () => {
            cy.contains('Adjudication Report Form')
                .should('be.visible');
        });
    })


    describe('Chart Actions', () => {
        it('should display chart for selected event', () => {
            cy.get('.chart-view-event-detail')
                .should('exist')
                .and('be.visible');


        });
    });

    describe('Video', () => {
        it('should display video stream', () => {
            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible');
        });

        it('should switch between video streams', () => {

            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible')

            // pause video
            cy.get('button[data-testid="PauseRoundedIcon"]')
                .click();

            // click button to go to next video stream, verify video stream is visible
            cy.get('button[data-testid="NavigateAfterIcon"]')
                .should('be.visible')
                .then(($btn) => {
                    if(!$btn.is(':disabled')){

                        cy.wrap($btn).click();

                        cy.get('img-video-mjpeg')
                            .should('exist')
                            .and('be.visible');
                    }
                });
        });
    });


    describe("Event Adjudication", () => {
        it('should successfully adjudicate an event', () => {

            // todo: check if i need to reselect an event and open event details
            cy.get('.MuiSelect-select')
                .contains('Adjudicate')
                .click();
            cy.get('.MuiList-root')
                .should('be.visible');
            cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                .click();

            // select unknown isotope
            cy.get('.MuiSelect-select')
                .contains('Isotope')
                .click();
            cy.get('.MuiList-root')
                .should('be.visible');
            cy.get('[data-value="Unknown"]')
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
        });
    });

    describe('Navigate back', () => {
        it('should navigate back to dashboard', () => {
            cy.contains('button', 'Back')
                .click();

            cy.url().should('include', '/dashboard');
        });
    });
});