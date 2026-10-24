import React from "react";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import AlarmQrExportButton from "../../src/app/_components/alarm-transfer/AlarmQrExportButton";
import EventIdentity from "../../src/app/_components/event-details/EventIdentity";

const OCCUPANCY_UUID = "123e4567-e89b-42d3-a456-426614174000";

function withLanguage(component: React.ReactNode) {
    return <LanguageProvider>{component}</LanguageProvider>;
}

describe("alarm export event identity", () => {
    it("disables QR export and explains why while the UUID is unresolved", () => {
        cy.mount(withLanguage(
            <AlarmQrExportButton event={{occupancyObsId: ""} as any} lane={{} as any}/>,
        ));

        cy.get('[data-testid="alarm-qr-export-button"]').should("be.disabled");
        cy.get('[data-testid="alarm-qr-export-button"]').parent().trigger("mouseover");
        cy.contains("The Event UUID is still being resolved").should("be.visible");
    });

    it("keeps the printable identity visible while withholding copy controls until resolution", () => {
        cy.mount(withLanguage(<EventIdentity occupancyUuid={null}/>));

        cy.get('[data-testid="event-identity"]').should("be.visible");
        cy.get('[data-testid="event-uuid-export-unavailable"]').should("be.visible");
        cy.get('[data-testid="copy-event-uuid"]').should("not.exist");
        cy.get('[data-testid="copy-event-direct-link"]').should("not.exist");
    });

    it("shows an explicit failure and lets the user retry UUID resolution", () => {
        const retry = cy.stub().as("retryIdentity");
        cy.mount(withLanguage(
            <EventIdentity
                occupancyUuid={null}
                resolutionState="failed"
                onRetry={retry}
            />,
        ));

        cy.get('[data-testid="event-uuid-resolution-failed"]')
            .should("contain.text", "OSCAR could not resolve the Event UUID");
        cy.get('[data-testid="event-uuid-export-unavailable"]').should("not.exist");
        cy.get('[data-testid="event-uuid-resolution-retry"]').click();
        cy.get("@retryIdentity").should("have.been.calledOnce");
    });

    it("enables QR and identity actions after UUID resolution", () => {
        cy.mount(withLanguage(
            <>
                <AlarmQrExportButton event={{occupancyObsId: OCCUPANCY_UUID} as any} lane={{} as any}/>
                <EventIdentity occupancyUuid={OCCUPANCY_UUID} nodeId="node-1"/>
            </>,
        ));

        cy.get('[data-testid="alarm-qr-export-button"]').should("be.enabled");
        cy.get('[data-testid="event-uuid-value"]').should("have.text", OCCUPANCY_UUID);
        cy.get('[data-testid="copy-event-uuid"]').should("be.enabled");
        cy.get('[data-testid="copy-event-direct-link"]').should("be.enabled");
        cy.get('[data-testid="event-uuid-export-unavailable"]').should("not.exist");
    });

    it("falls back to the textarea copy path when Clipboard API permission is denied", () => {
        cy.window().then(win => {
            const writeText = cy.stub().rejects(new Error("permission denied")).as("writeText");
            const execCommand = cy.stub().returns(true).as("execCommand");
            Object.defineProperty(win.navigator, "clipboard", {
                configurable: true,
                value: {writeText},
            });
            Object.defineProperty(win.document, "execCommand", {
                configurable: true,
                value: execCommand,
            });
        });

        cy.mount(withLanguage(<EventIdentity occupancyUuid={OCCUPANCY_UUID} nodeId="node-1"/>));
        cy.get('[data-testid="copy-event-uuid"]').click();
        cy.get("@writeText").should("have.been.calledOnceWithExactly", OCCUPANCY_UUID);
        cy.get("@execCommand").should("have.been.calledOnceWithExactly", "copy");
        cy.get('[data-testid="event-copy-status"]')
            .should("have.attr", "role", "status")
            .and("contain.text", "Event UUID copied");
    });

    it("shows a localized error when both clipboard mechanisms fail", () => {
        cy.window().then(win => {
            const writeText = cy.stub().rejects(new Error("permission denied"));
            const execCommand = cy.stub().returns(false);
            Object.defineProperty(win.navigator, "clipboard", {
                configurable: true,
                value: {writeText},
            });
            Object.defineProperty(win.document, "execCommand", {
                configurable: true,
                value: execCommand,
            });
        });

        cy.mount(withLanguage(<EventIdentity occupancyUuid={OCCUPANCY_UUID} nodeId="node-1"/>));
        cy.get('[data-testid="copy-event-direct-link"]').click();
        cy.get('[data-testid="event-copy-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "Could not copy. Copy the value manually.");
    });
});
