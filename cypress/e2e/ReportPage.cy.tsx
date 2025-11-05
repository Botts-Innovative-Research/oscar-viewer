describe('Report Page (E2E)', () => {
    before(() => {
        cy.visitReportPage();
    });

    // Helper functions to reduce duplication
    const selectNode = (nodeValue = 'node-0.9753074657637626') => {
        cy.get('.MuiSelect-select').first().click();
        cy.get('.MuiList-root').should('be.visible');
        cy.get(`[data-value="${nodeValue}"]`).click();
    };

    const selectOption = (label: string, value: any, isMultiSelect: boolean) => {
        cy.contains('label', label)
            .parent()
            .find('.MuiSelect-select')
            .click();
        cy.get('.MuiList-root').should('be.visible');
        cy.get(`[data-value="${value}"]`).click();

        if (isMultiSelect) {
            cy.get('body').type('{esc}');
        }
    };


    const generateReport = () => {
        cy.wait(200);
        cy.contains('button', 'Generate Report').should('not.be.disabled').click();
    };

    const verifyReportGeneration = () => {
        cy.get('iframe', { timeout: 15000 })
            .should('exist')
            .and('be.visible')
            .then(($iframe) => {
                const src = $iframe.attr('src');
                expect(src, 'iframe has pdf src').to.match(/\.pdf$/);
                expect(src).to.not.be.empty;
            });
    };

    const generateAndVerifyReport = (config: any) => {
        selectNode();
        selectOption('Report Type', config.reportType, false);

        if (config.lane) {
            selectOption('Lane Selector', config.lane, true);
        }

        if (config.eventType) {
            selectOption('Event Type', config.eventType, false);
        }

        selectOption('Time Range', config.timeRange, false);

        if (config.customDates) {
            // TODO: Implement custom date selection
        }

        generateReport();
        verifyReportGeneration();
    };

    describe('RDS Site Reports', () => {
        const timeRanges = [
            { value: 'last24Hrs', label: '24hrs' },
            { value: 'last7days', label: '7 days' },
            { value: 'last30days', label: '30 days' },
            { value: 'thisMonth', label: 'this month' }
        ];

        timeRanges.forEach(({ value, label }) => {
            it(`should generate RDS Site report for ${label}`, () => {
                generateAndVerifyReport({
                    reportType: 'RDS_SITE',
                    timeRange: value
                });
            });
        });

        it.skip('should generate RDS Site report with custom date range', () => {
            generateAndVerifyReport({
                reportType: 'RDS_SITE',
                timeRange: 'custom',
                customDates: { start: '2024-01-01', end: '2025-12-31' }
            });
        });
    });

    describe('Lane Reports', () => {
        const timeRanges = [
            { value: 'last24Hrs', label: '24 hrs' },
            { value: 'last7days', label: '7 days' },
            { value: 'last30days', label: '30 days' },
            { value: 'thisMonth', label: 'this month' }
        ];

        timeRanges.forEach(({ value, label }) => {
            it(`should generate Lane report for ${label}`, () => {
                generateAndVerifyReport({
                    reportType: 'LANE',
                    lane: 'urn:osh:system:lane:rapiscan',
                    timeRange: value
                });
            });
        });

        it.skip('should generate Lane report with custom range', () => {
            generateAndVerifyReport({
                reportType: 'LANE',
                lane: 'urn:osh:system:lane:rapiscan',
                timeRange: 'custom',
                customDates: { start: '2024-01-01', end: '2025-12-31' }
            });
        });
    });

    describe('Event Reports', () => {
        const eventTypes = [
            { value: 'ALARMS', label: 'Alarms' },
            { value: 'ALARMS_OCCUPANCIES', label: 'Alarms & Occupancies' },
            { value: 'SOH', label: 'SOH' }
        ];

        const timeRanges = [
            { value: 'last24Hrs', label: '24 hrs' },
            { value: 'last7days', label: '7 days' },
            { value: 'last30days', label: '30 days' },
            { value: 'thisMonth', label: 'this month' }
        ];

        eventTypes.forEach(({ value: eventValue, label: eventLabel }) => {
            describe(`${eventLabel} Event Reports`, () => {
                timeRanges.forEach(({ value: timeValue, label: timeLabel }) => {
                    it(`should generate ${eventLabel} Event report for ${timeLabel}`, () => {
                        generateAndVerifyReport({
                            reportType: 'EVENT',
                            lane: 'urn:osh:system:lane:rapiscan',
                            eventType: eventValue,
                            timeRange: timeValue
                        });
                    });
                });

                it.skip(`should generate ${eventLabel} Event report with custom range`, () => {
                    generateAndVerifyReport({
                        reportType: 'EVENT',
                        lane: 'urn:osh:system:lane:rapiscan',
                        eventType: eventValue,
                        timeRange: 'custom',
                        customDates: { start: '2024-01-01', end: '2025-12-31' }
                    });
                });
            });
        });
    });

    describe('Adjudication Reports', () => {
        const timeRanges = [
            { value: 'last24Hrs', label: '24hrs' },
            { value: 'last7days', label: '7 days' },
            { value: 'last30days', label: '30 days' },
            { value: 'thisMonth', label: 'this month' }
        ];

        timeRanges.forEach(({ value, label }) => {
            it(`should generate Adjudication report for ${label}`, () => {
                generateAndVerifyReport({
                    reportType: 'ADJUDICATION',
                    lane: 'urn:osh:system:lane:rapiscan',
                    timeRange: value
                });
            });
        });

        it.skip('should generate Adjudication report with custom range', () => {
            generateAndVerifyReport({
                reportType: 'ADJUDICATION',
                lane: 'urn:osh:system:lane:rapiscan',
                timeRange: 'custom',
                customDates: { start: '2024-01-01', end: '2025-12-31' }
            });
        });
    });
});