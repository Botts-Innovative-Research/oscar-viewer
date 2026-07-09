/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Live HLS video pipeline verification ("Phase C"): cold start on lane-view, then a
// server-side stream teardown mid-playback (the same state the node's inactivity
// watchdog or another client's endStream produces) and automatic recovery via the
// viewer's restartStream path. Requires baseUrl to point at a node with the ffmpeg
// lane simulator feeds running.

const LOCAL_NODE = [{
    name: 'cypress-local',
    address: 'localhost',
    port: 8282,
    oshPathRoot: '/sensorhub',
    csAPIEndpoint: '/api',
    bucketsEndpoint: '/buckets',
    auth: {username: 'admin', password: 'oscar'},
    isSecure: false,
    isDefaultNode: true,
}];

/**
 * Assert the <video> element is actually playing by sampling currentTime twice.
 * Tolerates timeline resets (a recovered stream starts a fresh mux at t=0) by only
 * ever comparing a fresh pair of samples.
 */
function assertVideoAdvancing(label: string, budgetMs: number, minDelta = 0.8) {
    const deadline = Date.now() + budgetMs;
    const attempt = (): Cypress.Chainable => {
        return cy.get('video').then(($v) => {
            const t1 = ($v[0] as HTMLVideoElement).currentTime;
            return cy.wait(2500, {log: false}).then(() =>
                cy.get('video').then(($v2) => {
                    const t2 = ($v2[0] as HTMLVideoElement).currentTime;
                    if (t2 > t1 + minDelta) {
                        cy.log(`${label}: video advancing (${t1.toFixed(1)}s -> ${t2.toFixed(1)}s)`);
                        return;
                    }
                    if (Date.now() > deadline)
                        throw new Error(`${label}: video not advancing (t1=${t1}, t2=${t2})`);
                    return attempt();
                })
            );
        });
    };
    return attempt();
}

describe('Live video stream recovery', () => {

    it('cold-starts lane video and auto-recovers after a server-side stream teardown', () => {
        let startCount = 0;
        let controlStreamId: string | null = null;

        cy.intercept('POST', '**/api/controlstreams/*/commands', (req) => {
            const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            if (body.includes('startStream')) {
                startCount++;
                const m = req.url.match(/controlstreams\/([^/]+)\/commands/);
                if (m) controlStreamId = m[1];
                req.alias = 'startCmd';
            }
        });

        cy.visit('/lane-view', {
            onBeforeLoad(win) {
                win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
            },
        });

        // A fresh profile selects no lane; pick one explicitly.
        cy.contains('Lane ID', {timeout: 30000})
            .parents('.MuiFormControl-root')
            .find('.MuiSelect-select')
            .click();
        cy.get('li[role="option"]', {timeout: 15000}).first().click();

        cy.wait('@startCmd', {timeout: 30000});

        // Cold start: video comes up and actually plays.
        cy.get('video', {timeout: 30000}).should('exist');
        assertVideoAdvancing('cold start', 30000);

        // Kill the stream server-side, exactly as the inactivity watchdog (or a second
        // client sending endStream) would: the mux closes and the HLS files are deleted.
        cy.then(() => {
            expect(controlStreamId, 'captured control stream id from app startStream').to.be.a('string');
            cy.log(`stomping control stream ${controlStreamId}`);
        });
        cy.then(() => {
            const before = startCount;
            cy.request({
                method: 'POST',
                url: `${Cypress.config('baseUrl')}/sensorhub/api/controlstreams/${controlStreamId}/commands`,
                auth: {username: 'admin', password: 'oscar'},
                headers: {'Content-Type': 'application/json'},
                body: {parameters: {streamControl: 'endStream'}},
                timeout: 20000,
            }).then((resp) => {
                expect(resp.status, 'endStream accepted').to.be.within(200, 202);
            });
            // The player must notice the dead stream (manifest/segment 404s -> fatal
            // network error after hls.js's own retry budget) and re-arm it on its own.
            cy.wrap(null, {timeout: 120000}).should(() => {
                expect(startCount, 'viewer re-sent startStream on its own').to.be.greaterThan(before);
            });
        });

        // And the video must actually be playing again on the fresh mux.
        assertVideoAdvancing('post-teardown recovery', 90000);
    });
});
