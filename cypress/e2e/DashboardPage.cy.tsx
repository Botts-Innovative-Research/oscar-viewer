
describe('Dashboard', () => {
    before(() => {
        cy.visit("/");
        cy.intercept('GET', '**/api/**', { log: false });
    });

    describe('Performance Testing', () => {
        it('FE-PERF-007 Load initial alarm data', () => {

            const start = Date.now();

            cy.get('.MuiDataGrid-row', { timeout: 10000 })
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(9000);
                });

            cy.get('body').then(($body) => {
                const hasMap = $body.find('[id="mapcontainer"]').is(':visible');
                const hasEventPreview = $body.find('.MuiDataGrid-row.selected-row').length > 0;

                if (hasMap) {
                    cy.get('[id="mapcontainer"]').should('be.visible');
                } else if (hasEventPreview) {
                    cy.contains('Occupancy ID:').should('be.visible');
                } else {
                    // Neither state is active, this might indicate a problem
                    cy.get('[id="mapcontainer"]').should('be.visible');
                }
            });

            cy.contains('Lane Status', { timeout: 10000 })
                .should('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });
        });
    });

    describe('Alarm Table', () => {
        it('FE-PERF-004 - Apply Filter to the past alarms view', () => {

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
                .type('Gamma{enter}');

            // verify only gamma events are displayed in table
            cy.get('.MuiDataGrid-row').contains('Gamma');

            cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
                .clear();

        });
    });

    describe('Event Preview - Rapiscan', () => {
        beforeEach(() => {
            cy.selectRapiscanEvent();
        })

        it.skip('select event to open event preview', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row', { timeout: 2000 } )
                .should('exist').then(() => {

                // Verify occupancy ID is visible
                cy.contains('Occupancy ID: ')
                    .should('be.visible');

                //TODO: chart displayed
                cy.get('div.chart-view-event-detail')
                    .find('canvas')
                    .should('exist')
                    .and('be.visible');

                cy.get('video').then(($video) => {
                    const video = $video[0];
                    return new Cypress.Promise((resolve) => {
                        video.onloadedmetadata = () => {
                            expect(video.duration).to.be.greaterThan(0);
                            resolve();
                        };
                    });
                });

            });
        });

        it('FE-PERF-001 Adjudicate a selected alarm', () => {

            cy.get('.MuiDataGrid-row.selected-row', {timeout: 2000} )
                .should('exist')
                .then(() => {

                    // adjudicate
                    cy.get('.MuiSelect-select').first().click();
                    cy.get('.MuiList-root').should('be.visible');
                    cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                        .click();

                    //secondary inspection
                    cy.contains('label', 'Secondary Inspection')
                        .parent()
                        .find('.MuiSelect-select')
                        .click();
                    // cy.get('.MuiSelect-select').().click();
                    cy.get('.MuiList-root').should('be.visible');
                    cy.get('[data-value="NONE"]')
                        .click();


                    cy.get('textarea[id="outlined-multiline-static"]')
                        .clear().type('Testing notes');

                    cy.contains('button', 'Submit')
                        .click();

                    cy.contains('Occupancy ID: ')
                        .should('not.exist');

                });
        });

        it.skip('select event and expand to event details', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row')
                .should('exist');

            // Verify occupancy ID is visible
            cy.contains('Occupancy ID: ').should('be.visible');

            cy.get('[aria-label="expand"]').click({force: true}); //click expand button

            cy.url().should('include', '/event-details'); // check url contains event-details now

            cy.wait(500);

            cy.contains('button', 'Back').click();
            cy.url().should('include', '/');
        });

        it.skip('should close event preview when button clicked', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row')
                .should('exist');

            cy.get('[data-testid="CloseRoundedIcon"]')
                .click({force: true}); //click close button

            // event preview should not exist
            cy.contains('Occupancy ID:')
                .should('not.exist');

            cy.get('.MuiDataGrid-row.selected-row')
                .should('not.exist');

        });

        // todo be able to navigate between video streams
        // it.skip('switch between video streams in event preview', () => {
        //     // Verify that row is now selected
        //     cy.get('.MuiDataGrid-row.selected-row')
        //         .should('exist')
        //         .then(() => {
        //
        //             cy.get('video').then(($video) => {
        //                 const video = $video[0];
        //                 return new Cypress.Promise((resolve) => {
        //                     video.onloadedmetadata = () => {
        //                         expect(video.duration).to.be.greaterThan(0);
        //                         resolve();
        //                     };
        //                 });
        //             });
        //
        //
        //             // get right arrow and check if disabled if disable only 1 video, else click the button
        //             cy.get('button[data-testid="NavigateNextIcon"]')
        //                 .click();
        //
        //             cy.get('video').then(($video) => {
        //                 const video = $video[0];
        //                 return new Cypress.Promise((resolve) => {
        //                     video.onloadedmetadata = () => {
        //                         expect(video.duration).to.be.greaterThan(0);
        //                         resolve();
        //                     };
        //                 });
        //             });
        //         });
        //
        // });

        // afterEach(() => {
        //     //close event preview
        //     cy.get('.MuiDataGrid-row.selected-row').click();
        //
        //     cy.get('.MuiDataGrid-row.selected-row')
        //         .should('not.exist');
        // })

    });

    describe('Event Preview - Aspect', () => {
        beforeEach(() => {
            cy.selectAspectEvent();
        })

        it.skip('Select Aspect Event from table and open event preview', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row', { timeout: 2000 } )
                .should('exist').then(() => {

                // Verify occupancy ID is visible
                cy.contains('Occupancy ID: ')
                    .should('be.visible');

                //TODO: chart displayed
                cy.get('div.chart-view-event-detail')
                    .find('canvas')
                    .should('exist')
                    .and('be.visible');

                cy.get('video').then(($video) => {
                    const video = $video[0];
                    return new Cypress.Promise((resolve) => {
                        video.onloadedmetadata = () => {
                            expect(video.duration).to.be.greaterThan(0);
                            resolve();
                        };
                    });
                });

            });
        });

        it('FE-PERF-001 Adjudicate a selected alarm from an aspect event', () => {

            cy.get('.MuiDataGrid-row.selected-row', {timeout: 2000} )
                .should('exist')
                .then(() => {

                    // adjudicate
                    cy.get('.MuiSelect-select').first().click();
                    cy.get('.MuiList-root').should('be.visible');
                    cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                        .click();

                    //secondary inspection

                    cy.contains('label', 'Secondary Inspection')
                        .parent()
                        .find('.MuiSelect-select')
                        .click()
                    // cy.get('.MuiSelect-select').().click();
                    cy.get('.MuiList-root').should('be.visible');
                    cy.get('[data-value="NONE"]')
                        .click();


                    cy.get('textarea[id="outlined-multiline-static"]')
                        .clear().type('Testing notes');

                    cy.contains('button', 'Submit')
                        .click();

                    cy.contains('Occupancy ID: ')
                        .should('not.exist');

                });
        });

        it.skip('select an Aspect event and expand to event details', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row')
                .should('exist');

            // Verify occupancy ID is visible
            cy.contains('Occupancy ID: ').should('be.visible');

            cy.get('[aria-label="expand"]').click({force: true}); //click expand button

            cy.url().should('include', '/event-details'); // check url contains event-details now

            cy.wait(500);

            cy.contains('button', 'Back').click();
            cy.url().should('include', '/');
        });

        it.skip('should close an Asepct event preview when button clicked', () => {

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row')
                .should('exist');

            cy.get('[data-testid="CloseRoundedIcon"]')
                .click({force: true}); //click close button

            // event preview should not exist
            cy.contains('Occupancy ID:')
                .should('not.exist');

            cy.get('.MuiDataGrid-row.selected-row')
                .should('not.exist');

        });
    });

    describe('Lane Status', () => {
        it.skip('should navigate to a rapiscan lane', () => {
            cy.get('[data-testid="CheckCircleIcon"]')
                .get('[aria-label="Rap Lane"]')
                .should('be.visible')
                .click();

            cy.contains('Lane View: Rap Lane')
                .should('be.visible').first()
                .click();

            cy.url().should('include', '/lane-view/');

            cy.wait(500);
            cy.contains('button', 'Back').click();
            cy.url().should('include', '/');
        });

        it.skip('should navigate to an aspect lane', () => {

            cy.get('[data-testid="CheckCircleIcon"]').get('[aria-label="Aspect Lane"]')
                .should('be.visible')
                .click();

            cy.contains('Lane View: Aspect Lane')
                .should('be.visible').first()
                .click();

            cy.url().should('include', '/lane-view/');

            cy.wait(500);
            cy.contains('button', 'Back').click();
            cy.url().should('include', '/');
        });
    });

    // describe.skip('Map', () => {
    //     it('should navigate to lane view from pointmarker', () => {
    //
    //     });
    //
    //     it('should open popup when pointmarker selected', () => {
    //
    //     });
    // });
});





