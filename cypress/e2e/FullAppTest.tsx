describe('Full Client Testing', () => {

    before(() => {
        cy.intercept({ resourceType: /xhr|fetch/ }, { log: false }); // doesnt print fetch logs
        // before starting visit the account page
        cy.visit('/');
    });
    ``
    it('user enters login cred and navigates to dashboard', () => {
        cy.get('input[id="username"]').type('testuser'); //type in input into field
        cy.get('[id="username"]').should('have.value', 'testuser'); //verify input was updated

        cy.get('input[id="password"]').type('password123');
        cy.get('[id="password"]').should('have.value', 'password123');

        cy.get('button[name="login-btn"]').click();

        cy.get('[id="volume-snackbar"]')
            .should('be.visible')
            .and('contain', 'Alarms will trigger audible sound in client');

        cy.url().should('include', '/dashboard');
    });

    //TODO: check this on each new page
    it('FE-PERF-007 Load initial alarm data', () => {

        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).should('exist').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(5000);
        });

        cy.get('[id="mapcontainer"]', {timeout: 10000}).should('be.visible').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(5000);
        });

        cy.contains('Lane Status', {timeout: 10000}).should('be.visible').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(5000);
        });

    })

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
        cy.get('img').should('have.class', 'video-mjpeg');
        // for mjpeg video possible looking at src and see if the value changes?
    });


    it('FE-PERF-001 Adjudicate a selected alarm', () => {
        cy.wait(2000);

        cy.get('.MuiSelect-select').click();

        cy.get('.MuiList-root').should('be.visible');
        cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]').click();

        cy.get('input[value="Code 9: Authorized Test, Maintenance, or Training Activity"]').should('be.visible')

        cy.get('textarea[id="outlined-multiline-static"]').clear().type('Testing notes');

        cy.contains('button', 'Submit').click();

        // cy.get('[id="adj-snack-msg"]').should('be.visible')
        //     .should('match',/Adjudication Submitted Successfully | Adjudication Submission Failed. Check connection and form then try again./);

        cy.contains('Occupancy ID: ').should('not.exist');
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
        cy.get('img').should('have.class', 'video-mjpeg');

        cy.get('button[aria-label="expand"]').click(); //click expand button

        cy.url().should('include', '/event-details'); // check url contains event-details now
        cy.contains('Event Details').should('be.visible'); //another way to verify the event details page is now showing

    });

    it('Adjudicate an event in event details', () => {
        // ADJUDICATION TEST
        cy.get('.MuiSelect-select').contains('Adjudicate').click();
        cy.get('.MuiList-root').should('be.visible');
        cy.get('[data-value="Code 9: Authorized Test, Maintenance, or Training Activity"]').click();

        // select unknown isotope
        cy.get('.MuiSelect-select').contains('Isotope').click();
        cy.get('.MuiList-root').should('be.visible');
        cy.get('[data-value="Unknown"]').click();

        // type in note area
        cy.get('textarea[id="outlined-multiline-static"]').clear().type('Testing notes- ignore');

        // type in vehicle id
        cy.get('input[name="vehicleId"]').clear().type('Test Vehicle');

        //submit adjudication form
        cy.contains('button', 'Submit').click();

        //CLICK BACK
        cy.contains('button', 'Back').click();

        cy.url().should('include', '/dashboard');
    });

    it('select another event and then close event preview', () => {

        // Check if a row is already selected
        cy.selectRapiscanEvent();

        // Verify that row is now selected
        cy.get('.MuiDataGrid-row.selected-row').should('exist');


        // Verify occupancy ID is visible
        cy.contains('Occupancy ID: ').should('be.visible');

        // CLOSE
        cy.get('button[data-testid="CloseRoundedIcon"]').click(); //click close button

        // event preview should not exist
        cy.get('Occupancy ID:').should('not.exist');

        cy.get('.MuiDataGrid-row.selected-row').should('not.exist');

    })

    it('Open rapiscan lane view on click', () => {
        cy.get('[data-testid="CheckCircleIcon"]').should('be.visible').click();
        //click on first lane status (the lane will be called "Rapiscan" and another test lane "Aspect")
        cy.get('[aria-label="Rapiscan"]').should('be.visible').first().click();
        //verify the url is lane view
        cy.url().should('include', '/lane-view/');

    });

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


    it('FE-PERF-002: Open a  live lane view and video stream appears in < 3 seconds', () => {
        const start = Date.now();

        cy.get('img', {timeout: 10000}).should('have.class', 'video-mjpeg').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(3000);
        });
    });

    it('switch between video streams in lane view', () => {

        cy.get('img').should('have.class', 'video-mjpeg');

        // pause video
        cy.get('button[data-testid="PauseRoundedIcon"]').click();

        // get right arrow and check if disabled if disable only 1 video, else click the button
        cy.get('button[data-testid="NavigateAfterIcon"]').and('not.be.disabled').click();

        cy.get('img').should('have.class', 'video-mjpeg');

    });

    /
    it('FE-PERF-003- Load the National View table & table populates in <3 seconds', () => {

        //click national page icon and navigate to national view page
        cy.get('button[=""]').click();

        cy.contains('National View:').should('be.visible');

        cy.url().should('include', '/national-view');

        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).should('have.lengthOf.greaterThan', 0).then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(3000);
        });
    });


    it('click event log on navbar and table populates < 3 seconds', () => {

        //click event log page icon and navigate to event log page
        cy.get('button[=""]').click();

        cy.contains('Event Log:').should('be.visible');

        cy.url().should('include', '/event-log');

        const start = Date.now();

        cy.get('.MuiDataGrid-row', {timeout: 10000}).should('exist').then(() => {
            const duration = Date.now() - start;

            expect(duration).to.be.lessThan(3000);
        });
    });

    it('FE-PERF-005 - View details of a non-alarming occupancy.', () => {

        //click first row in table that status is None
        cy.selectNoneEvent();

        cy.get('.MuiDataGrid-row.selected-row')
            .within(() => {
                cy.get('button[data-testid="MoreVertIcon"]')
                    .closest('button')
                    .click();
            });


        // menu is displayed to navigate to details
        cy.get('.MuiList-root .MuiDataGrid-menulist')
            .should('be.visible');

        cy.get('.MuiMenuItem-root')
            .contains('Details')
            .click();

        // event details page is opened
        cy.url().should('include', '/event-details/');

    });
});