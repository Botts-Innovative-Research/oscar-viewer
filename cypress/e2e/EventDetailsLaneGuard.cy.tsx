describe('Event details lane guard', () => {
    it('shows a recoverable warning when a persisted event references an unavailable lane', () => {
        const eventData = {
            id: 'lane-guard-event',
            laneId: 'missing-lane',
            occupancyCount: 1,
            occupancyObsId: 'missing-observation',
            startTime: '2026-01-01T00:00:00.000Z',
            endTime: '2026-01-01T00:00:01.000Z',
            status: 'Gamma',
            adjudicatedIds: [],
            videoPaths: [],
        };

        const persistedRoot = JSON.stringify({
            eventPreview: JSON.stringify({
                eventPreview: {isOpen: true, eventData},
                shouldForceAlarmTableDeselect: false,
                selectedRowId: eventData.id,
                latestGB: null,
            }),
            _persist: JSON.stringify({version: 1, rehydrated: true}),
        });

        cy.visit('/event-details', {
            onBeforeLoad(window) {
                window.localStorage.setItem('oscar_credentials_migrated_v1', 'true');
                window.localStorage.setItem('persist:root', persistedRoot);
            },
        });

        cy.contains('Event Details', {timeout: 20000}).should('be.visible');
        cy.contains('Lane missing-lane is unavailable', {timeout: 20000}).should('be.visible');
        cy.contains('Application error').should('not.exist');
    });
});
