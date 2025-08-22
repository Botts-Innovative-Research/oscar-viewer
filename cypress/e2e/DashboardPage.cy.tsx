

describe('Dashboard View Page (E2E)', () => {
    beforeEach('Set up', () => {
        cy.visit('/dashboard');
    });


    it('table loads', () => {

    });

    it('lane status loads', () => {

    });

    it('map loads', () => {

    });


});

/*
FE-PERF-002:Open a  live lane view and video stream appears in <3 seconds
 */
describe('Lane Status', () => {
    beforeEach('SetUp', () => {

    });

    it('click on the first lane status and open lane view', () => {

    });
})

/**
 * load dashboard
 * click on an event in the table
 * event preview opens
 * id matches the table id for event
 * charts/video load and play
 *
 *
 * --- adjudicate alarm
 *
 * --- expand to event details page
 *
 * --- close the event
 */
describe('Event Preview', () => {
    beforeEach('Set up', () => {
        cy.visit('/dashboard');
        cy.contains('Occupancy Id: ').should('be.visible');
    });


    it('Adjudicates an alarm and closes the event preview', () => {
        cy.get('input[id="outlined-multiline-static"]').clear().type('Testing notes');

        cy.contains('button', 'Submit').click();

        cy.get('[id="adj-snack-msg"]')
            .should('be.visible')
            .should('match',/Adjudication Submitted Successfully | Adjudication Submission Failed. Check connection and form then try again./);

        cy.contains('Occupancy ID: ').should('not.exist');
    });

    it('Expand an event preview, navigates to event details page', () => {
        cy.get('button[aria-label="expand"]').click(); //click expand button

        cy.contains('Event Details').should('be.visible');
    });

    it('', () => {

    });
});

/*
selected aspect event from table

chart loads and displays only cps chart for gamma events or neutron chart for neutron selected events

should not include a button to switch between nsigma/cps for aspect

charts appear in sync with video and are not 'wonky'
 */
describe('aspect event preview -- chart', () => {

    it('Gamma event selected chart is displayed', () => {
        //click on first gamma event in table for aspect rpm

        // event preview is open
        cy.contains('Occupancy ID: Aspect').should('be.visible');

        // charts display with gamma curve

    });

    it('Neutron event selected, and neutron chart correctly displays in the chart', () => {

        //click on first neutron event in table for aspect rpm

        //event preview opens

        //chart displays with neutron curve
    });

    it('Neutron-Gamma event selected, and both charts appear in event preview', () => {
        //click on first gamma-neutron event in table for aspect rpm

        //event preview opens

        //neutron chart is displayed with neutron curve and gamma chart is displayed with gamma curve

    });

});


describe('rapiscan event preview -- chart', () => {

    it('Gamma charts appear with cps and threshold at the same time', () => {
        cy.contains('Gamma').click();

    });

    it('Can toggle between nsigma and cps charts (Rapiscan only)', () => {

    });

    it('Rapiscan RPM chart displays correctly and timebar moves properly in sync with video', () => {

    });
});

describe('Video Playback', () => {
    it('Pressing Pause, stops the video playback', () => {

    });

    it('Pressing play, starts the video playback', () => {

    });

    it('Pause video, scrubbing video', () => {

    });


    it('Can switch between video streams', () => {
        // event is selected from table

        // videos
    });
})


describe('Map', () => {
    beforeEach('Set up', () => {
        cy.visit('/dashboard');
    });

    it('selecting point marker displays popup with lanename, status, and view lane button', () => {

    });

    it('clicking view lane navigates to lane view for selected point marker', () => {


    });
});


describe('Event Table', () => {
    beforeEach('Set up', () => {
        cy.visit('/dashboard');
    });


    it('table populates < 3 seconds', () => {
        cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);

        // check if table has columns
        cy.get('[data-field="laneId"]').should('be.visible');
        cy.get('[data-field="occupancyId"]').should('be.visible');
        cy.get('[data-field="status"]').should('be.visible');
    });

    it('use a filter on the alarm table', () => {
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

    it('Selecting an alarm from the table, the event becomes selected', () => {

        // click first row in table
        cy.get('.MuiDataGrid-row').first().click();

        // cy.get('aria-selected = true')
        cy.get('.MuiDataGrid-row').first()
            .should('have.class', 'selected-row');

        //verify row is selected (either by highlight color or that event preview is now visible)
        cy.contains('Occupancy ID:').should('be.visible');
    });

    it('adjudicated alarm is removed from table', () => {

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

describe('Event Table (FOR NON-ALARMING)', () => {
    beforeEach('Set up', () => {
        cy.visit('/event-log');
    });

    it('table populates < 3 seconds', () => {
        cy.get('.MuiDataGrid-row', {timeout: 3000}).should('have.lengthOf.greaterThan', 0);

        // check if table has columns
        cy.get('[data-field="laneId"]').should('be.visible');
        cy.get('[data-field="occupancyId"]').should('be.visible');
        cy.get('[data-field="status"]').should('be.visible');
    });

    it('use a filter on the alarm table', () => {
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

    it('Select a non-alarming occupancy and navigate to event details', () => {

        // click first row in table that status is None
        cy.get('.MuiDataGrid-row').first()
            .get('[data-field="Status"]').contains('None').click();


        cy.get('.MuiDataGrid-row').first()
            .should('have.class', 'selected-row');

        cy.get('[data-field="Menu"]').click();

        // menu is displayed to navigate to details
        cy.get('.MuiList-root .MuiDataGrid-menulist').first();
        cy.get('.MuiMenuItem-root').contains('Details').click();


        // event details page is opened
    });

});