/**
 *
 * FE-PERF-007: load initial alarm data when dashboard page loads ( less than 5 seconds)>
 *
 * select an alarm from the table, the event becomes selected
 *
 * FE-PERF-004: use a filter on the alarm table (less than 3 seconds)
 *
 *
 * FE-PERF-005: View details of a non-alarming occupancy.
 */

describe('Event Table Dashboard(Component)', () => {
    beforeEach('Set up page', () => {
        cy.visit('/dashboard');
    });

    it('initial alarm data loads when page loads', () => {
    });

    it('use a filter on the alarm table', () => {
    });

    it('Selecting an alarm from the table, the event becomes selected', () => {
    });

    it('adjudicated alarm is removed from table', () => {

    });
});


describe('Event Table Event Log(Component)', () => {

    beforeEach('Set up page', () => {
        cy.visit('/event-log');
    });

    it('initial alarm data loads when page loads', () => {
    });

    it('use a filter on the event log table', () => {
    });

    it('Selecting an alarm from the table, the event becomes selected', () => {
    });

    it('View details of a non-alarming occupancy', () => {
    });


});

describe('Event Table Lane View (Component)', () => {
    beforeEach('set up page',() => {
        cy.visit('/lane-view');
    });

    it('initial alarm data loads when page loads, and only shows events from the selected lane', () => {
    });
});
