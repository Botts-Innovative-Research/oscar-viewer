import React from "react";
import {ThemeProvider} from "@mui/material";

import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import LaneStatusItem from "../../src/app/_components/dashboard/LaneStatusItem";
import {getTheme} from "../../src/app/style/theme";
import {
    deriveLaneHealthRows,
    type FaultHealth,
    type LaneHealth,
    type LaneHealthRow,
    useLaneHealthClock,
} from "../../src/lib/data/oscar/useLaneHealth";

type LaneRowOverrides = Partial<Omit<LaneHealthRow, "faults">> & {
    faults?: Partial<FaultHealth>;
};

const CLEAR_FAULTS: FaultHealth = {
    gammaHigh: "clear",
    gammaLow: "clear",
    neutronHigh: "clear",
    tamper: "clear",
};

function laneRow(overrides: LaneRowOverrides = {}): LaneHealthRow {
    const base: LaneHealthRow = {
        laneName: "Lane 7",
        nodeName: "Local Node",
        rpm: {id: "rpm-7", label: "RPM 7", state: "online"},
        cameras: [],
        faults: CLEAR_FAULTS,
        occupancyState: "clear",
        occupancyStartedAt: null,
        lastUpdatedAt: Date.parse("2026-10-16T16:00:00.000Z"),
        occupancyDuration: 0,
        extendedOccupancy: "clear",
        hasFault: false,
        hasOfflineComponent: false,
        hasUnknownTelemetry: false,
    };

    return {
        ...base,
        ...overrides,
        faults: {...base.faults, ...overrides.faults},
    };
}

function mountLane(
    health: LaneHealthRow,
    onSelect: () => void = cy.stub(),
    onClearTamper: (event: React.MouseEvent<HTMLButtonElement>) => void = cy.stub(),
) {
    return cy.mount(
        <ThemeProvider theme={getTheme("light")}>
            <LanguageProvider>
                <LaneStatusItem
                    health={health}
                    onSelect={onSelect}
                    onClearTamper={onClearTamper}
                />
            </LanguageProvider>
        </ThemeProvider>,
    );
}

function connectionSelector(laneName: string, kind: "rpm" | "camera", componentId: string) {
    return `[data-testid="lane-health-${laneName}-${kind}"][data-component-id="${componentId}"]`;
}

function faultSelector(laneName: string, kind: string) {
    return `[data-testid="lane-health-${laneName}-${kind}"]`;
}

function OccupancyClockHarness({lanes}: {lanes: LaneHealth[]}) {
    const now = useLaneHealthClock(lanes, 1);
    const rows = deriveLaneHealthRows(lanes, now, 1);
    return (
        <>
            {rows.map((lane) => (
                <span key={lane.laneName} data-testid={`clock-${lane.laneName}`}>
                    {lane.extendedOccupancy}
                </span>
            ))}
        </>
    );
}

describe("dashboard lane health indicators", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("language", "en");
    });

    it("shows RPM and every camera connection independently, including unknown state", () => {
        mountLane(laneRow({
            rpm: {id: "rpm-7", label: "RPM 7", state: "online"},
            cameras: [
                {id: "camera-east", label: "Camera East", state: "online"},
                {id: "camera-west", label: "Camera West", state: "offline"},
                {id: "camera-overhead", label: "Camera Overhead", state: "unknown"},
            ],
            hasOfflineComponent: true,
            hasUnknownTelemetry: true,
        }));

        cy.get(connectionSelector("Lane 7", "rpm", "rpm-7"))
            .should("have.attr", "data-state", "online")
            .and("have.attr", "aria-label", "RPM 7: Online")
            .find('[data-testid="SensorsRoundedIcon"]')
            .should("exist");

        cy.get(connectionSelector("Lane 7", "camera", "camera-east"))
            .should("have.attr", "data-state", "online")
            .and("have.attr", "aria-label", "Camera East: Online")
            .find('[data-testid="VideocamRoundedIcon"]')
            .should("exist");

        cy.get(connectionSelector("Lane 7", "camera", "camera-west"))
            .should("have.attr", "data-state", "offline")
            .and("have.attr", "aria-label", "Camera West: Offline")
            .find('[data-testid="VideocamOffRoundedIcon"]')
            .should("exist");

        cy.get(connectionSelector("Lane 7", "camera", "camera-overhead"))
            .should("have.attr", "data-state", "unknown")
            .and("have.attr", "aria-label", "Camera Overhead: Unknown")
            .and("contain.text", "?")
            .find('[data-testid="VideocamRoundedIcon"]')
            .should("exist");

        cy.get('[data-testid="lane-health-Lane 7-camera"]').should("have.length", 3);
        cy.get('[data-testid="lane-health-card-Lane 7"]').should("have.css", "padding-top", "0px");
    });

    it("shows active and unknown fault states while omitting clear fault icons", () => {
        const noop = () => {};
        cy.mount(
            <LanguageProvider>
                <LaneStatusItem
                    health={laneRow({
                        laneName: "Active Lane",
                        faults: {
                            gammaHigh: "active",
                            gammaLow: "active",
                            neutronHigh: "active",
                            tamper: "active",
                        },
                        extendedOccupancy: "active",
                        hasFault: true,
                    })}
                    onSelect={noop}
                    onClearTamper={noop}
                />
                <LaneStatusItem
                    health={laneRow({
                        laneName: "Unknown Lane",
                        rpm: {id: "rpm-unknown", label: "RPM Unknown", state: "unknown"},
                        faults: {
                            gammaHigh: "unknown",
                            gammaLow: "unknown",
                            neutronHigh: "unknown",
                            tamper: "unknown",
                        },
                        occupancyState: "unknown",
                        extendedOccupancy: "unknown",
                        hasUnknownTelemetry: true,
                    })}
                    onSelect={noop}
                    onClearTamper={noop}
                />
                <LaneStatusItem
                    health={laneRow({laneName: "Clear Lane"})}
                    onSelect={noop}
                    onClearTamper={noop}
                />
            </LanguageProvider>,
        );

        const faultKinds = ["gamma-high", "gamma-low", "neutron-high", "tamper", "extended-occupancy"];
        const activeLabels = [
            "Gamma high: Fault",
            "Gamma low: Fault",
            "Neutron high: Fault",
            "Tamper: Fault",
            "Extended occupancy: Fault",
        ];
        const unknownLabels = [
            "Gamma high: Unknown",
            "Gamma low: Unknown",
            "Neutron high: Unknown",
            "Tamper: Unknown",
            "Extended occupancy: Unknown",
        ];

        faultKinds.forEach((kind, index) => {
            cy.get(faultSelector("Active Lane", kind))
                .should("have.attr", "data-state", "active")
                .and("have.attr", "aria-label", activeLabels[index]);
            cy.get(faultSelector("Unknown Lane", kind))
                .should("have.attr", "data-state", "unknown")
                .and("have.attr", "aria-label", unknownLabels[index])
                .and("contain.text", "?");
            cy.get(faultSelector("Clear Lane", kind)).should("not.exist");
        });
    });

    it("clears tamper without selecting the lane", () => {
        const onSelect = cy.stub().as("selectLane");
        const onClearTamper = cy.stub().callsFake((event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
        }).as("clearTamper");
        mountLane(laneRow({
            faults: {...CLEAR_FAULTS, tamper: "active"},
            hasFault: true,
        }), onSelect, onClearTamper);

        cy.get('button[aria-label="Clear tamper for Lane 7"]').click();
        cy.get("@clearTamper").should("have.been.calledOnce");
        cy.get("@selectLane").should("not.have.been.called");
    });

    it("selects the lane with either Enter or Space", () => {
        const onSelect = cy.stub().as("selectLane");
        mountLane(laneRow(), onSelect);

        cy.get('[role="link"][aria-label="Local Node - Lane 7"]')
            .focus()
            .trigger("keydown", {key: "Enter", code: "Enter"});
        cy.get("@selectLane").should("have.been.calledOnce");

        cy.get('[role="link"][aria-label="Local Node - Lane 7"]')
            .trigger("keydown", {key: " ", code: "Space"});
        cy.get("@selectLane").should("have.been.calledTwice");
    });

    it("derives extended occupancy only after the configured threshold", () => {
        const now = Date.parse("2026-10-16T16:00:00.000Z");
        const occupiedLane: LaneHealth = {
            laneName: "Lane 7",
            nodeName: "Local Node",
            rpm: {id: "rpm-7", label: "RPM 7", state: "online"},
            cameras: [],
            faults: CLEAR_FAULTS,
            occupancyState: "occupied",
            occupancyStartedAt: now - 60_000,
            lastUpdatedAt: now,
        };

        expect(deriveLaneHealthRows([occupiedLane], now - 1, 1)[0].extendedOccupancy).to.equal("clear");
        expect(deriveLaneHealthRows([occupiedLane], now, 1)[0].extendedOccupancy).to.equal("clear");
        expect(deriveLaneHealthRows([occupiedLane], now + 1, 1)[0].extendedOccupancy).to.equal("active");
        expect(deriveLaneHealthRows([occupiedLane], now + 1, 2)[0].extendedOccupancy).to.equal("clear");

        expect(deriveLaneHealthRows([{
            ...occupiedLane,
            occupancyStartedAt: null,
        }], now, 1)[0].extendedOccupancy).to.equal("unknown");
        expect(deriveLaneHealthRows([{
            ...occupiedLane,
            occupancyState: "clear",
            occupancyStartedAt: null,
        }], now, 1)[0].extendedOccupancy).to.equal("clear");
    });

    it("advances every occupied lane at its own threshold deadline", () => {
        const now = Date.parse("2026-10-16T16:00:00.000Z");
        cy.clock(now);
        const base = laneRow();
        const lanes: LaneHealth[] = [
            {
                ...base,
                laneName: "Lane 1",
                occupancyState: "occupied",
                occupancyStartedAt: now - 30_000,
            },
            {
                ...base,
                laneName: "Lane 2",
                occupancyState: "occupied",
                occupancyStartedAt: now - 15_000,
            },
        ];

        cy.mount(<OccupancyClockHarness lanes={lanes}/>);
        cy.get('[data-testid="clock-Lane 1"]').should("have.text", "clear");
        cy.get('[data-testid="clock-Lane 2"]').should("have.text", "clear");

        cy.tick(30_001);
        cy.get('[data-testid="clock-Lane 1"]').should("have.text", "active");
        cy.get('[data-testid="clock-Lane 2"]').should("have.text", "clear");

        cy.tick(15_000);
        cy.get('[data-testid="clock-Lane 2"]').should("have.text", "active");
    });
});
