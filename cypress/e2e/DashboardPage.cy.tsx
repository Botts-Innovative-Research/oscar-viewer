
describe('Dashboard', () => {
    before(() => {
        cy.visitDashboard();
    });

    describe('Performance Testing', () => {
        it('FE-PERF-007 Load initial alarm data', () => {

            const start = Date.now();

            cy.get('.MuiDataGrid-row', {timeout: 10000})
                .should('exist')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            cy.get('[id="mapcontainer"]', {timeout: 10000})
                .should('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

            cy.contains('Lane Status', {timeout: 10000})
                .should('be.visible')
                .then(() => {
                    const duration = Date.now() - start;
                    expect(duration).to.be.lessThan(5000);
                });

        });

    });

    describe('Event Table', () => {
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
                .type('Gamma');

            // verify only gamma events are displayed in table
            cy.get('.MuiDataGrid-row').each(($row) => {
                cy.wrap($row).contains('Gamma');
            });
        });

    });

    describe('Event Preview', () => {

        it('select event to open event preview', () => {

            cy.selectRapiscanEvent();

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row', {timeout: 2000} ).should('exist');

            // Verify occupancy ID is visible
            cy.contains('Occupancy ID: ').should('be.visible');

            //TODO: chart displayed
            cy.get('.chart-view-event-detail').should('exist').and('be.visible');
            // check if chart has stuff on it? possible get canvas and check if pixels are available?
            // can also look into legends

            //TODO: video available
            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible');
            // for mjpeg video possible looking at src and see if the value changes?
        });

        it('FE-PERF-001 Adjudicate a selected alarm', () => {

            cy.get('.MuiSelect-select')
                .click();

            cy.get('.MuiList-root')
                .should('be.visible');

            cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                .click();

            cy.get('input[value="Code 9: Authorized Test, Maintenance, or Training Activity"]')
                .should('be.visible')

            cy.get('textarea[id="outlined-multiline-static"]')
                .clear().type('Testing notes');

            cy.contains('button', 'Submit')
                .click();

            // cy.get('[id="adj-snack-msg"]').should('be.visible')
            //     .should('match',/Adjudication Submitted Successfully | Adjudication Submission Failed. Check connection and form then try again./);

            cy.contains('Occupancy ID: ')
                .should('not.exist');
        });

        it('select event and expand to event details', () => {

            // Check if a row is already selected
            cy.selectRapiscanEvent();

            // Verify that row is now selected
            cy.get('.MuiDataGrid-row.selected-row')
                .should('exist');

            // Verify occupancy ID is visible
            cy.contains('Occupancy ID: ').should('be.visible');

            //chart displayed
            cy.get('.chart-view-event-detail').should('exist').and('be.visible');
            // check if chart has stuff on it? possible get canvas and check if pixels are available?

            //video available
            cy.get('img.video-mjpeg')
                .should('exist')
                .and('be.visible');

            cy.get('button[aria-label="expand"]').click(); //click expand button

            cy.url().should('include', '/event-details'); // check url contains event-details now
            cy.contains('Event Details').should('be.visible'); //another way to verify the event details page is now showing

        });

        it('should close event preview when button clicked', () => {
            cy.get('button[data-testid="CloseRoundedIcon"]')
                .click(); //click close button

            // event preview should not exist
            cy.get('Occupancy ID:')
                .should('not.exist');

            cy.get('.MuiDataGrid-row.selected-row')
                .should('not.exist');
        });
    });


    describe('Lane Status', () => {
        it('FE-PERF-002: Open a  live lane view and video stream appears in < 3 seconds', () => {

            cy.get('[data-testid="CheckCircleIcon"]')
                .should('be.visible')
                .click();

            cy.get('[aria-label="Rapiscan"]')
                .should('be.visible').first()
                .click();

            cy.url().should('include', '/lane-view/');

            cy.contains('button', 'Back').click();

            cy.url().should('include', '/dashboard');
        });
    });

    describe('Map', () => {
        it('should navigate to lane view from pointmarker', () => {

        });

        it('should open popup when pointmarker selected', () => {

        });
    });

    // describe.skip('Aspect Event Preview Charts', () => {
    //     /*
    //    selected aspect event from table
    //    chart loads and displays only cps chart for gamma events or neutron chart for neutron selected events
    //    should not include a button to switch between nsigma/cps for aspect
    //    charts appear in sync with video and are not 'wonky'
    //    */
    //
    //     it('displays gamma chart for gamma event', () => {
    //         //TODO: click on first gamma event in table for aspect rpm
    //
    //         //click first gamma status
    //         cy.get('.MuiDataGrid-row').first().get('[data-field="LaneId"]').contains('Aspect')
    //             .get('[data-field="Status"]').contains('Gamma').click();
    //
    //         // event preview is open
    //         cy.contains('Occupancy ID: Aspect').should('be.visible');
    //
    //         // charts display with gamma curve
    //         // chart id == chart-view-event-detail-gamma-
    //         cy.get('[id="chart-view-event-detail-gamma-"]').should('exist');
    //     });
    //
    //     it('Neutron event selected, and neutron chart correctly displays in the chart', () => {
    //
    //         //click on first neutron event in table for aspect rpm
    //         cy.get('.MuiDataGrid-row').first().get('[data-field="LaneId"]').contains('Aspect')
    //             .get('[data-field="Status"]').contains('Neutron').click();
    //
    //         cy.get('.MuiDataGrid-row').first()
    //             .should('have.class', 'selected-row');
    //
    //         // event preview is open
    //         cy.contains('Occupancy ID: Aspect').should('be.visible');
    //
    //         //chart displays with neutron curve
    //         cy.get('[id="chart-view-event-detail-neutron-"]').should('exist');
    //     });
    //
    //     it('Neutron-Gamma event selected, and both charts appear in event preview', () => {
    //         //click on first gamma-neutron event in table for aspect rpm
    //         cy.get('.MuiDataGrid-row').first()
    //             .get('[data-field="LaneId"]').contains('Aspect')
    //             .get('[data-field="Status"]').contains('Gamma-Neutron')
    //             .click();
    //
    //         // cy.get('aria-selected = true')
    //         cy.get('.MuiDataGrid-row')
    //             .first()
    //             .should('have.class', 'selected-row');
    //
    //         // event preview is open
    //         cy.contains('Occupancy ID: Aspect')
    //             .should('be.visible');
    //
    //         //neutron chart is displayed with neutron curve and gamma chart is displayed with gamma curve
    //         cy.get('[id="chart-view-event-detail-gamma-"]')
    //             .should('exist');
    //         cy.get('[id="chart-view-event-detail-neutron-"]')
    //             .should('exist');
    //
    //     });
    //
    // });
    //
    // describe.skip('Rapiscan Event Preview Chart', () => {
    //     beforeEach(() => {
    //
    //     });
    //
    //     it('displays gamma chart with CPS and Nsigma', () => {
    //         //click first gamma status
    //         cy.get('.MuiDataGrid-row').first()
    //             .get('[data-field="laneId"]').contains('Rapiscan')
    //             .get('[data-field="status"]').contains('Gamma')
    //             .click();
    //
    //         // check that row is selected
    //         cy.get('.MuiDataGrid-row')
    //             .first()
    //             .should('have.class', 'selected-row');
    //
    //         // verify that event preview is visible by checking if occupany id is displayed on the screen
    //         cy.contains('Occupancy ID:').should('be.visible');
    //         cy.contains('[class="chart-view-event-detail"]').should('be.visible');
    //
    //
    //     });
    //
    //     it('can toggle between nsigma and cps charts', () => {
    //         //todo click on rapiscan gamma event and then click on toggle button that is cps
    //         // then toggle to the nsigma and check the charts to ensure they display correctly
    //
    //         //click first gamma status
    //         cy.get('.MuiDataGrid-row').first()
    //             .get('[data-field="LaneId"]').contains('Rapiscan')
    //             .get('[data-field="Status"]').contains('Gamma')
    //             .click();
    //
    //         // cy.get('aria-selected = true')
    //         cy.get('.MuiDataGrid-row')
    //             .first()
    //             .should('have.class', 'selected-row');
    //
    //         //verify row is selected (either by highlight color or that event preview is now visible)
    //         cy.contains('Occupancy ID:')
    //             .should('be.visible');
    //
    //         cy.contains('[class="chart-view-event-detail"]').should('be.visible');
    //
    //
    //
    //         // it should show cps first by default and nsigma shouldn't be visible
    //         // cy.get('button[key="cps"]').first().click();
    //         cy.contains('[id="chart-view-event-detail-nsigma-"]')
    //             .should('not.be.visible');
    //         cy.contains('[id="chart-view-event-detail-gamma-"]')
    //             .should('be.visible');
    //
    //         cy.get('button[value="sigma"]').first()
    //             .click();
    //         cy.get('[id="chart-view-event-detail-nsigma-"]')
    //             .should('be.visible');
    //         cy.get('[id="chart-view-event-detail-gamma-"]')
    //             .should('not.be.visible');
    //
    //     });
    //
    //     it('Rapiscan RPM chart displays correctly and time bar moves properly in sync with video', () => {
    //         //todo
    //     });
    // });
    //
    // describe.skip('Video Playback', () => {
    //     it('video displays when event preview loads', () => {
    //
    //         cy.get('[id="event-preview-video-"]').should('be.visible');
    //
    //         // cy.get( //video).should('be.visible');
    //     });
    //
    //     it('Pressing Pause, stops the video playback', () => {
    //
    //         // click button to pause on time controller
    //         cy.get('button[data-testid="PauseRoundedIcon"]').click();
    //
    //         // current time is not moving or time controller is not moving ?? to show it is paused?
    //
    //     });
    //
    //     it('Pressing play, starts the video playback', () => {
    //         // click button to play on time controller
    //         cy.get('button[data-testid="PlayRoundedIcon"]').click();
    //
    //     });
    //
    //     it('Pause video, scrubbing video', () => {
    //         //todo
    //
    //         // click pause video
    //         cy.get('button[data-testid="PauseRoundedIcon"]').click();
    //
    //         // click the slider and move it
    //
    //         cy.get('input[value=""]');
    //
    //         // time skips forward
    //     });
    //
    //     it('Can switch between video streams', () => {
    //         //todo
    //
    //         // check if video exists
    //         cy.contains('event-preview-video').should('exist');
    //
    //         // pause the video stream
    //         cy.get('button[data-testid="PauseRoundedIcon"]').click();
    //
    //         //check if the button is clickable or disabled if it is clickable click it !!
    //         cy.get('button[data-testid="NavigateNextIcon"').should('exist').click();
    //             // .get('class', 'Mui-disabled').should('not.exist')
    //
    //         // press play to start the video stream
    //         cy.get('button[data-testid="PlayRoundedIcon"]').click();
    //
    //
    //         // old video is hidden, new video shows
    //         cy.contains('event-preview-video-').should('not.be.visible');
    //         cy.contains('event-preview-video-').should('be.visible');
    //
    //     });
    //
    // });
    //
    // describe.skip('Map', () => {
    //     beforeEach(() => {
    //         cy.get('[id="mapcontainer"]')
    //             .should('be.visible');
    //
    //         // find the point marker and click
    //         cy.get('[alt="Marker"]').click();
    //     });
    //
    //     it('selecting point marker displays popup with lanename, status, and button', () => {
    //
    //         // pop up should be visible
    //         cy.get('.leaflet-popup-content-wrapper').should('be.visible');
    //
    //         // should have status, lanename and button visible
    //         cy.get("popup-text-lane").contains('Aspect').should('be.visible');
    //         cy.get("popup-text-status").contains('Status:').should('be.visible');
    //         cy.get('button["VIEW LANE"]').should('be.visible');
    //         // cy.get('[id="popup-data-layer"]').should('be.visible');
    //
    //     });
    //
    //     it('navigate to lane view from point marker', () => {
    //
    //         // check if popup menu is visible
    //
    //         // find button to view lane and click it
    //         cy.get('button["VIEW LANE"]').click();
    //         // check url to see if navigation occured to lane view
    //         cy.url().should('include', '/lane-view');
    //
    //     });
    // });
    //
    // describe.skip('Event Table - Alarming Events', () => {
    //     // FE-PERF-007 - Load initial alarm data upon page load.
    //     it('table populates < 3 seconds', () => {
    //         cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);
    //
    //         // check if table has columns
    //         cy.get('[data-field="laneId"]').should('be.visible');
    //         cy.get('[data-field="occupancyId"]').should('be.visible');
    //         cy.get('[data-field="status"]').should('be.visible');
    //     });
    //
    //     // FE-PERF-004 - Apply Filter to the past alarms view
    //     it('apply filter to alarm table', () => {
    //         cy.get('button[aria-label="Show filters"]')
    //             .click();
    //
    //         // add a filter
    //         cy.get('.MuiDataGrid-filterForm')
    //             .should('be.visible');
    //
    //         // filter by status in drop down menu
    //         cy.get('.MuiDataGrid-filterForm .MuiSelect-select').first()
    //             .click();
    //
    //         cy.get('.MuiMenuItem-root')
    //             .contains('Status')
    //             .click();
    //
    //         // set filter to Gamma
    //         cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
    //             .clear()
    //             .type('Gamma');
    //
    //         // TODO verify only gamma events are displayed in table
    //         cy.get('');
    //     });
    //
    //     it('selecting event opens event preview', () => {
    //
    //         // click first row in table
    //         cy.get('.MuiDataGrid-row')
    //             .first()
    //             .click();
    //
    //         // cy.get('aria-selected = true')
    //         cy.get('.MuiDataGrid-row').first()
    //             .should('have.class', 'selected-row');
    //
    //         //verify row is selected (either by highlight color or that event preview is now visible)
    //         cy.contains('Occupancy ID:')
    //             .should('be.visible');
    //     });
    //
    //     // FE-PERF-001 Adjudicate a selected alarm
    //     it('remove adjudicated event from table', () => {
    //         //todo
    //
    //         // event table size
    //
    //         // click first row in table
    //
    //         // event preview is visible
    //
    //         // type in notes box testing adj
    //
    //         // click submit
    //
    //         // event preview closes
    //
    //         // event table size = size - 1 (item was removed)
    //
    //         //timeout 3000  to update the UI
    //     });
    // });

});


