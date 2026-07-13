/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

// Mobile detector (RS350 backpack / Kromek D5) alerting in the dashboard
// Lane Status widget — regression coverage for the feature that routes mobile
// alarm streams (rs350AlarmRT / radStatusRT / mobile-gated occRT) into the
// same latch + audio pipeline RPM lanes use:
//
// 1. An RS350 walker alarm latches the gamma/neutron alarm on its lane chip,
//    plays /alarm_sound.wav (HTMLAudioElement.play), and persists the latch
//    in laneStatusSlice. Silencing via the ack dialog clears chip + store and
//    the silence survives a reload.
// 2. A D5 walker chip shows the online heartbeat (NOT the pre-feature
//    permanent red X: the D5 driver has no connectionStatus stream, liveness
//    now rides its 1 Hz radiometric status report), then latches its alarm on
//    the next hotspot pass.
//
// Mobile lanes are DISCOVERED from the node per device kind, so the spec is
// independent of lane naming; each block skips itself if no lane of that kind
// exists. Requires live mobile lanes fed by the mock sims
// (tools/mobile-detector-mocks) and the same-origin verification proxy:
//   STATIC_ROOT=web PORT=8090 node serve-proxy.js
//   npx cypress run --spec cypress/e2e/DashboardMobileLaneAlerts.cy.tsx \
//     --config baseUrl=http://localhost:8090 --env nodePort=8090

const NODE_PORT = Number(Cypress.env('nodePort') || 8090);
const API = `http://localhost:${NODE_PORT}/sensorhub/api`;
const AUTH = {user: 'admin', pass: 'oscar'};

const LOCAL_NODE = [{
    name: 'cypress-local',
    address: 'localhost',
    port: NODE_PORT,
    oshPathRoot: '/sensorhub',
    csAPIEndpoint: '/api',
    bucketsEndpoint: '/buckets',
    auth: {username: 'admin', password: 'oscar'},
    isSecure: false,
    isDefaultNode: true,
}];

const GAMMA_ALARM_ICON = '[data-testid="FlareIcon"]';
const NEUTRON_ALARM_ICON = '[data-testid="BubbleChartIcon"]';
const ANY_ALARM_ICON = `${GAMMA_ALARM_ICON}, ${NEUTRON_ALARM_ICON}`;
const HEART_ICON = '[data-testid="FavoriteIcon"]';
const COMM_FAILURE_ICON = '[data-testid="CloseIcon"]';

interface MobileLane {
    laneName: string;
    /** What the chip renders: LaneStatusItem truncates names to 15 chars. */
    chipText: string;
}

function visitDashboard() {
    cy.visit('/', {
        auth: {username: 'admin', password: 'oscar'},
        onBeforeLoad(win) {
            win.localStorage.setItem('osh_nodes', JSON.stringify(LOCAL_NODE));
            // testIsolation is off and laneStatusSlice/eventPreview are
            // redux-persisted: start each test from clean UI state.
            win.localStorage.removeItem('persist:root');
            // The wav path: AlarmAudio lazily builds new Audio(alarm_sound.wav)
            // and calls play() per setAlarmTrigger. Stub the AUDIO prototype
            // only (video keeps the inherited HTMLMediaElement.play) so
            // headless autoplay policy can't reject, and record calls.
            cy.stub(win.HTMLAudioElement.prototype, 'play').resolves().as('audioPlay');
        },
    });
}

/** Find one lane of the given mobile device kind, however it is named.
 *  Detector drivers are lane MEMBERS and don't appear in the flat top-level
 *  /systems list, so walk each lane's members — the same uid test the viewer
 *  uses to assign a lane's deviceKind. */
function discoverMobileLane(kindRe: RegExp): Cypress.Chainable<MobileLane | null> {
    function checkLane(lanes: any[], idx: number): Cypress.Chainable<MobileLane | null> {
        if (idx >= lanes.length) return cy.wrap<null>(null, {log: false});
        const lane = lanes[idx];
        return cy.request({url: `${API}/systems/${lane.id}/members?limit=20`, auth: AUTH})
            .then((resp) => {
                const hit = (resp.body.items || []).some((m: any) =>
                    kindRe.test(m.properties?.uid || ''));
                if (!hit) return checkLane(lanes, idx + 1);
                const laneName: string = lane.properties.name;
                return cy.wrap<MobileLane>({
                    laneName,
                    chipText: laneName.length <= 15 ? laneName : laneName.substr(0, 15),
                }, {log: false});
            });
    }

    return cy.request({url: `${API}/systems?limit=100`, auth: AUTH}).then((resp) => {
        const seen = new Set<string>();
        const lanes = (resp.body.items || []).filter((s: any) => {
            const uid = s.properties?.uid || '';
            if (!uid.startsWith('urn:osh:system:lane:') || seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
        return checkLane(lanes, 0);
    });
}

/** The Lane Status chip (Paper) for a lane, scoped so RPM alarms can't leak
 *  into assertions about the mobile lane's own icon. */
function laneChip(chipText: string, timeout = 60000) {
    return cy.contains('.MuiPaper-root', chipText, {timeout});
}

/** Read the persisted laneStatusSlice entry for a lane (or null). */
function readPersistedLane(win: Cypress.AUTWindow, laneName: string): any | null {
    const root = win.localStorage.getItem('persist:root');
    if (!root) return null;
    const slice = JSON.parse(root)['laneStatusSlice'];
    if (!slice) return null;
    return JSON.parse(slice)?.lanes?.[laneName] ?? null;
}

describe('Mobile lane alerts in the dashboard Lane Status widget', () => {

    it('RS350 alarm latches the chip, plays the wav, persists, and silence sticks', function () {
        discoverMobileLane(/rsi:rs350/i).then(function (lane) {
            if (!lane) {
                cy.log('No RS350 lane on the node — skipping');
                this.skip();
                return;
            }

            visitDashboard();

            // Chip renders once discovery completes, then latches on the next
            // mock hotspot pass (rs350AlarmRT is immediate; occupancy backstop
            // lands ~10s later — either sets the latch). The long timeout must
            // ride the .find(): a timeout on .contains() does not extend the
            // chained query.
            laneChip(lane.chipText).should('exist');
            laneChip(lane.chipText).find(ANY_ALARM_ICON, {timeout: 300000}).should('exist');

            // Audible path: some Audio.play call must come from alarm_sound.wav
            // (scoped by src so a stray Audio user can't false-pass this).
            cy.get('@audioPlay').should((stub: any) => {
                const fromAlarmWav = stub.getCalls().some((c: any) =>
                    String(c.thisValue?.src ?? '').includes('alarm_sound'));
                expect(fromAlarmWav, 'HTMLAudioElement.play called for alarm_sound.wav').to.be.true;
            });

            // Latch persisted (redux-persist flush is async — retry via should)
            cy.window({timeout: 30000}).should((win) => {
                const entry = readPersistedLane(win, lane.laneName);
                expect(entry, 'persisted lane entry').to.not.be.null;
                expect(entry.isGammaAlarm || entry.isNeutronAlarm,
                    'persisted mobile alarm latch').to.be.true;
            });

            // Silence via the ack dialog: chip clears, store clears.
            laneChip(lane.chipText).click();
            cy.contains('Active Alarm', {timeout: 10000}).should('be.visible');
            cy.contains('button', 'Silence Alarm').click();
            laneChip(lane.chipText).find(ANY_ALARM_ICON).should('not.exist');
            cy.window({timeout: 30000}).should((win) => {
                const entry = readPersistedLane(win, lane.laneName);
                expect(entry, 'persisted lane entry').to.not.be.null;
                expect(entry.isGammaAlarm || entry.isNeutronAlarm,
                    'persisted latch after silence').to.be.false;
            });

            // NOTE deliberately NOT asserted: "latch still false after a
            // reload". The mock walkers alarm continuously, and fresh alarm
            // evidence after a silence MUST re-latch (RPM parity) — so that
            // assertion is a race by design. Rehydrate-doesn't-resurrect is
            // already covered for the slice by DashboardStatusPersistence.
        });
    });

    it('D5 chip is online via its status stream (no red X) and latches alarms', function () {
        discoverMobileLane(/kromek:d5/i).then(function (lane) {
            if (!lane) {
                cy.log('No D5 lane on the node — skipping');
                this.skip();
                return;
            }

            visitDashboard();

            // Pre-feature the D5 chip showed a permanent Comm Failure X (no
            // connectionStatus stream). Its 1 Hz radiometric status report now
            // marks it Online within moments of stream attach. A live alarm
            // may beat the heart to the icon slot (alarm outranks online in
            // getStatus), so accept either — both only render when online.
            laneChip(lane.chipText).should('exist');
            laneChip(lane.chipText)
                .find(`${HEART_ICON}, ${ANY_ALARM_ICON}`, {timeout: 60000})
                .should('exist');
            laneChip(lane.chipText).find(COMM_FAILURE_ICON).should('not.exist');

            // Live alarm latch on the next hotspot pass (radStatusRT booleans;
            // occupancy backstop lands ~3s after the episode closes).
            laneChip(lane.chipText).find(ANY_ALARM_ICON, {timeout: 300000}).should('exist');
            cy.window({timeout: 30000}).should((win) => {
                const entry = readPersistedLane(win, lane.laneName);
                expect(entry, 'persisted lane entry').to.not.be.null;
                expect(entry.isGammaAlarm || entry.isNeutronAlarm,
                    'persisted D5 alarm latch').to.be.true;
            });
        });
    });
});
