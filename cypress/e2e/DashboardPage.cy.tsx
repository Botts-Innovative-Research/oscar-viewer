/**
 * test set up:
 * create two lanes on admin panel:
 * - one aspect lane with 2 cameras
 * - one rapiscan lane with 2 cameras
 */
describe('Dashboard View Page (E2E)', () => {
    beforeEach(() => {
        cy.visit('/dashboard');
    });

    describe('Render dashboard components', () => {
        it('should load lane status, map and alarm table', () => {
            // make sure lane status, map and event table are loaded onto dashboard page
            cy.contains('Lane Status').should('be.visible');

            cy.get('[id="mapcontainer"]').should('have.class', 'leaflet-container').should('be.visible');

            cy.get('.MuiDataGrid-root').should('be.visible');
        });
    });

    describe('Lane Status', () => {
        //FE-PERF-002: Open a  live lane view and video stream appears in < 3 seconds
        it('Open rapiscan lane view on click', () => {
            //click on first lane status (the lane will be called "Rapiscan" and another test lane "Aspect")
            cy.get('[aria-label="Rapiscan"]').first().click();
            //verifty the url is lane view
            cy.url().should('include', '/lane-view');
        });
    });

    describe('Event Preview', () => {
        /**
         * load dashboard
         * click on an event in the table
         * event preview opens
         * id matches the table id for event
         * charts/video load and play
         * --- adjudicate alarm
         * --- expand to event details page
         * --- close the event
         */
        beforeEach(() => {
            cy.contains('Occupancy Id: ').should('be.visible');
        });

        // FE-PERF-001 Adjudicate a selected alarm.
        it('Adjudicates an alarm and closes the preview', () => {
            cy.get('input[id="outlined-multiline-static"]').clear().type('Testing notes');

            cy.contains('button', 'Submit').click();

            cy.get('[id="adj-snack-msg"]').should('be.visible')
                .should('match',/Adjudication Submitted Successfully | Adjudication Submission Failed. Check connection and form then try again./);

            cy.contains('Occupancy ID: ').should('not.exist');
        });

        it('expands event preview to event details page', () => {
            cy.get('button[aria-label="expand"]').click(); //click expand button
            cy.contains('Event Details').should('be.visible');
        });
    });

    describe('Aspect Event Preview Charts', () => {
        /*
       selected aspect event from table
       chart loads and displays only cps chart for gamma events or neutron chart for neutron selected events
       should not include a button to switch between nsigma/cps for aspect
       charts appear in sync with video and are not 'wonky'
       */

        it('displays gamma chart for gamma event', () => {
            //TODO: click on first gamma event in table for aspect rpm

            // event preview is open
            cy.contains('Occupancy ID: Aspect').should('be.visible');

            // charts display with gamma curve
            // chart id == chart-view-event-detail-gamma-
            cy.get('[id="chart-view-event-detail-gamma-"]').should('exist');
        });

        it('Neutron event selected, and neutron chart correctly displays in the chart', () => {

            //TODO: select neutron event for aspect
            //click on first neutron event in table for aspect rpm

            //event preview opens

            //chart displays with neutron curve
        });

        it('Neutron-Gamma event selected, and both charts appear in event preview', () => {
            //todo select gamma-neutron event for aspect
            //click on first gamma-neutron event in table for aspect rpm

            //event preview opens

            //neutron chart is displayed with neutron curve and gamma chart is displayed with gamma curve

        });

    });

    describe('Rapiscan Event Preview Chart', () => {
        it('displays gamma chart with CPS and Nsigma', () => {

            //click first gamma status
            cy.get('.MuiDataGrid-row').first().get('[data-field="LaneId"]').contains('Rapiscan')
                .get('[data-field="Status"]').contains('Gamma').click();

            // cy.get('aria-selected = true')
            cy.get('.MuiDataGrid-row').first()
                .should('have.class', 'selected-row');

            //verify row is selected (either by highlight color or that event preview is now visible)
            cy.contains('Occupancy ID:').should('be.visible');
            cy.contains('Gamma').click();

        });

        it('can toggle between nsigma and cps charts', () => {
            //todo click on rapiscan gamma event and then click on toggle button that is cps
            // then toggle to the nsigma and check the charts to ensure they display correctly
        });

        it('Rapiscan RPM chart displays correctly and timebar moves properly in sync with video', () => {
            //todo
        });
    });

    describe('Video Playback', () => {
        it.skip('Pressing Pause, stops the video playback', () => {
            //todo
        });

        it.skip('Pressing play, starts the video playback', () => {
            //todo
        });

        it.skip('Pause video, scrubbing video', () => {
            //todo
        });

        it.skip('Can switch between video streams', () => {
            //todo
        });
    })

    describe('Map', () => {
        it.skip('selecting point marker displays popup with lanename, status, and button', () => {
            //todo
        });

        it.skip('navigate to laneview from pointmarker', () => {
            //todo
        });
    });

    describe('Event Table - Alarming Events', () => {
        // FE-PERF-007 - Load initial alarm data upon page load.
        it('table populates < 3 seconds', () => {
            cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);

            // check if table has columns
            cy.get('[data-field="laneId"]').should('be.visible');
            cy.get('[data-field="occupancyId"]').should('be.visible');
            cy.get('[data-field="status"]').should('be.visible');
        });

        // FE-PERF-004 - Apply Filter to the past alarms view
        it('apply filter to alarm table', () => {
            cy.get('button[aria-label="Show filters"]').click();

            // add a filter
            cy.get('.MuiDataGrid-filterForm').should('be.visible');

            // filter by status in drop down menu
            cy.get('.MuiDataGrid-filterForm .MuiSelect-select').first().click();
            cy.get('.MuiMenuItem-root').contains('Status').click();

            // set filter to Gamma
            cy.get('.MuiDataGrid-filterForm input[placeholder="Filter value"]')
                .clear()
                .type('Gamma');

            // TODO verify only gamma events are displayed in table
            cy.get('');
        });

        it('selecting event opens event preview', () => {

            // click first row in table
            cy.get('.MuiDataGrid-row').first().click();

            // cy.get('aria-selected = true')
            cy.get('.MuiDataGrid-row').first()
                .should('have.class', 'selected-row');

            //verify row is selected (either by highlight color or that event preview is now visible)
            cy.contains('Occupancy ID:').should('be.visible');
        });

        // FE-PERF-001 Adjudicate a selected alarm
        it.skip('remove adjudicated event from table', () => {
            //todo

            // event table size

            // click first row in table

            // event preview is visible

            // type in notes box testing adj

            // click submit

            // event preview closes

            // event table size = size - 1 (item was removed)

            //timeout 3000  to update the UI
        });
    });

});




