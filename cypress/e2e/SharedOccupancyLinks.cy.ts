import {OCCUPANCY_PILLAR_DEF} from "../../src/lib/data/Constants";

describe("shared occupancy links", () => {
    beforeEach(() => {
        cy.intercept("GET", "/session", {username: "viewer"});
        cy.intercept({method: "GET", pathname: "/sensorhub/api"}, {});
        cy.intercept({method: "GET", pathname: "/sensorhub/api/systems"}, {items: [{
            type: "Feature", id: "lane-system", geometry: null,
            properties: {uid: "urn:osh:system:lane:shared:1", name: "Shared lane"},
        }]});
        cy.intercept({method: "GET", pathname: "/sensorhub/api/controlstreams"}, {items: []});
        cy.intercept({method: "GET", pathname: "/sensorhub/api/datastreams"}, request => {
            const customQuery = new URL(request.url).searchParams.has("observedProperty");
            request.reply({items: customQuery ? [] : [{id: "occupancy-stream", "system@id": "lane-system",
                name: "Occupancy", outputName: "occupancy", observedProperties: [{definition: OCCUPANCY_PILLAR_DEF}],
            }]});
        });
        cy.intercept("GET", "/sensorhub/api/observations/shared-37", {
            id: "shared-37", "datastream@id": "occupancy-stream",
            result: {occupancyCount: 37, startTime: "2026-10-25T01:00:00Z", endTime: "2026-10-25T01:00:01Z",
                maxGamma: 123, maxNeutron: 4, neutronBackground: 2,
                gammaAlarm: false, neutronAlarm: false, videoPaths: [], adjudicatedIds: []},
        }).as("loadShared");
    });

    function visit(path: string) {
        cy.visit(path, {onBeforeLoad(window) {
            window.localStorage.clear();
            window.localStorage.setItem("language", "en");
            window.localStorage.setItem("oscar_credentials_migrated_v1", "true");
        }});
    }

    it("opens and refreshes a non-alarm occupancy without a previous dashboard selection", () => {
        visit("/event-details/?id=shared-37");
        cy.wait("@loadShared");
        cy.contains("td", "Shared lane").should("be.visible");
        cy.contains("td", "37").should("be.visible");
        cy.contains("td", "123").should("be.visible");
        cy.contains("button", "Share occupancy").click();
        cy.get('[role="dialog"] input').invoke("val").should("contain", "id=shared-37").and("contain", "node=");
        cy.reload();
        cy.wait("@loadShared");
        cy.contains("td", "Shared lane").should("be.visible");
        cy.contains("Application error").should("not.exist");
    });

    it("shows a recoverable error for a deleted occupancy", () => {
        cy.intercept("GET", "/sensorhub/api/observations/deleted", {statusCode: 404});
        visit("/event-details/?id=deleted");
        cy.contains("This occupancy was not found").should("be.visible");
        cy.contains("button", "Retry").should("be.visible");
        cy.contains("button", "Share occupancy").should("not.exist");
    });
});
