import React, {useState} from "react";
import {configureStore} from "@reduxjs/toolkit";
import {Provider} from "react-redux";
import {ThemeProvider} from "@mui/material";

import NationalViewPage from "../../src/app/national-view/page";
import {DataSourceContext} from "../../src/app/contexts/DataSourceContext";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import {getTheme} from "../../src/app/style/theme";
import oshReducer from "../../src/lib/state/OSHSlice";
import laneReducer, {setLaneMap} from "../../src/lib/state/OSCARLaneSlice";
import {END_DEF, START_DEF} from "../../src/lib/data/Constants";


function counts(value: number) {
    return {
        numOccupancies: value,
        numGammaAlarms: value,
        numNeutronAlarms: value,
        numGammaNeutronAlarms: value,
        numFaults: value,
        numGammaFaults: value,
        numNeutronFaults: value,
        numTampers: value,
    };
}

function timeRanges(value: number) {
    return {
        allTime: counts(value),
        monthly: counts(value),
        weekly: counts(value),
        daily: counts(value),
    };
}

function observation(value: number) {
    return [{properties: {result: timeRanges(value)}}];
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return {promise, reject, resolve};
}

function statisticsControlStream() {
    return {
        properties: {
            id: "statistics-stream",
            "system@id": "oscar-system",
            controlledProperties: [
                {definition: START_DEF},
                {definition: END_DEF},
            ],
        },
    } as any;
}

function testNode(initialStatistics: Promise<any[]> | any[] = observation(1)) {
    const controlStream = statisticsControlStream();
    const getObservationById = cy.stub();
    return {
        id: "node-local",
        name: "Local Node",
        oscarServiceSystem: null,
        fetchLatestObservationWithFilter: cy.stub().returns(initialStatistics),
        fetchNodeControlStreams: cy.stub().resolves([controlStream]),
        getBasicAuthHeader: () => ({}),
        getConnectedSystemsEndpoint: () => "/sensorhub/api",
        getObservationsApi: () => ({getObservationById}),
        getObservationById,
    } as any;
}

function createTestStore(node: any, laneMap = new Map<string, any>()) {
    return configureStore({
        reducer: {
            oshSlice: oshReducer,
            laneSlice: laneReducer,
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }),
        preloadedState: {
            oshSlice: {nodes: [node], configNode: node},
            laneSlice: {lanes: [], laneMap, oscarService: []},
        } as any,
    });
}

function pageContext(activeViewKey: string | null, laneMap: Map<string, any>) {
    return {
        laneMapRef: {current: laneMap},
        laneMapReady: true,
        readyLaneNames: new Set(laneMap.keys()),
        activeViewKey,
        viewError: null,
        scopedHref: (path: string) => path,
    } as any;
}

function pageView(node: any, activeViewKey: string | null = null, laneMap = new Map<string, any>()) {
    const store = createTestStore(node, laneMap);
    return {
        store,
        view: (
            <Provider store={store as any}>
                <ThemeProvider theme={getTheme("light")}>
                    <LanguageProvider>
                        <DataSourceContext.Provider value={pageContext(activeViewKey, laneMap)}>
                            <NationalViewPage/>
                        </DataSourceContext.Provider>
                    </LanguageProvider>
                </ThemeProvider>
            </Provider>
        ),
    };
}

function commandParameters(requestBody: unknown) {
    const body = typeof requestBody === "string" ? JSON.parse(requestBody) : requestBody;
    return (body as any).parameters;
}

describe("National View asynchronous statistics", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("language", "en");
    });

    it("waits for a terminal status and exact observation before enabling Refresh", () => {
        const exactObservation = deferred<any>();
        const node = testNode();
        node.getObservationById.returns(exactObservation.promise);

        cy.intercept("POST", "**/sensorhub/api/controlstreams/statistics-stream/commands", {
            statusCode: 200,
            body: {"command@id": "command-1", statusCode: "PENDING"},
        }).as("statisticsCommand");
        cy.intercept("GET", "**/commands/command-1/status?order=desc&limit=1", {
            statusCode: 200,
            body: {items: [{
                "command@id": "command-1",
                statusCode: "COMPLETED",
                results: [{"observation@id": "observation-42"}],
            }]},
        }).as("statisticsStatus");

        cy.mount(pageView(node).view);
        cy.contains("button", "Refresh Statistics").should("be.enabled").click();
        cy.contains("button", "Refreshing statistics...")
            .should("be.disabled")
            .and("have.attr", "aria-busy", "true");
        cy.get('[role="combobox"]').should("have.attr", "aria-disabled", "true");
        cy.wait("@statisticsCommand");
        cy.wait("@statisticsStatus").then(() => {
            expect(node.getObservationById).to.have.been.calledOnceWith("observation-42");
        });
        cy.contains("button", "Refreshing statistics...").should("be.disabled");

        cy.then(() => exactObservation.resolve({properties: {result: timeRanges(42)}}));
        cy.contains("button", "Refresh Statistics").should("be.enabled");
        cy.contains(".MuiDataGrid-row", "Local Node").within(() => {
            cy.contains(".MuiDataGrid-cell", "42").should("exist");
        });
    });

    it("surfaces a durable failure and preserves the previous table", () => {
        const node = testNode();
        cy.intercept("POST", "**/sensorhub/api/controlstreams/statistics-stream/commands", {
            statusCode: 200,
            body: {"command@id": "command-failed", statusCode: "PENDING"},
        });
        cy.intercept("GET", "**/commands/command-failed/status?order=desc&limit=1", {
            statusCode: 200,
            body: {items: [{
                "command@id": "command-failed",
                message: "archive query failed",
                statusCode: "FAILED",
            }]},
        });

        cy.mount(pageView(node).view);
        cy.contains("button", "Refresh Statistics").should("be.enabled").click();
        cy.contains("Failed to refresh the statistics.", {timeout: 5000}).should("be.visible");
        cy.contains("button", "Refresh Statistics").should("be.enabled");
        cy.contains(".MuiDataGrid-row", "Local Node").within(() => {
            cy.contains(".MuiDataGrid-cell", "1").should("exist");
        });
    });

    it("keeps scoped range scans sequential and blocks a duplicate Refresh batch", () => {
        const laneMap = new Map<string, any>([["Lane 1", {
            parentNode: {id: "node-local"},
            laneSystem: {properties: {properties: {uid: "lane-east"}}},
        }]]);
        const node = testNode();
        let commandCount = 0;
        cy.intercept("POST", "**/sensorhub/api/controlstreams/statistics-stream/commands", (request) => {
            commandCount++;
            expect(commandParameters(request.body).laneUID).to.equal("lane-east");
            request.reply({
                delay: commandCount === 1 ? 400 : 0,
                statusCode: 200,
                body: {
                    "command@id": `scoped-${commandCount}`,
                    statusCode: "COMPLETED",
                    results: [{data: counts(commandCount)}],
                },
            });
        });

        cy.mount(pageView(node, "east-gate", laneMap).view);
        cy.wait(100).then(() => expect(commandCount).to.equal(1));
        cy.contains("button", "Refreshing statistics...").should("be.disabled");
        cy.get('[role="combobox"]').should("have.attr", "aria-disabled", "true");
        cy.contains("button", "Refresh Statistics", {timeout: 5000}).should("be.enabled");
        cy.then(() => expect(commandCount).to.equal(4));
    });

    it("cancels an old-scope refresh before it can replace the new scope cache", () => {
        const node = testNode();
        const scopedLaneMap = new Map<string, any>([["Lane 1", {
            parentNode: node,
            laneSystem: {properties: {properties: {uid: "lane-east"}}},
        }]]);
        const store = createTestStore(node);

        function ScopeHarness() {
            const [scope, setScope] = useState<string | null>(null);
            const [currentLaneMap, setCurrentLaneMap] = useState(new Map<string, any>());
            const switchScope = () => {
                store.dispatch(setLaneMap(scopedLaneMap));
                setCurrentLaneMap(scopedLaneMap);
                setScope("east-gate");
            };
            return (
                <Provider store={store as any}>
                    <ThemeProvider theme={getTheme("light")}>
                        <LanguageProvider>
                            <button data-testid="switch-scope" onClick={switchScope}>Switch scope</button>
                            <DataSourceContext.Provider value={pageContext(scope, currentLaneMap)}>
                                <NationalViewPage/>
                            </DataSourceContext.Provider>
                        </LanguageProvider>
                    </ThemeProvider>
                </Provider>
            );
        }

        cy.intercept("POST", "**/sensorhub/api/controlstreams/statistics-stream/commands", (request) => {
            const parameters = commandParameters(request.body);
            if (!parameters.laneUID) {
                request.reply({
                    statusCode: 200,
                    body: {"command@id": "old-scope", statusCode: "PENDING"},
                });
                return;
            }
            request.reply({
                statusCode: 200,
                body: {
                    "command@id": "new-scope",
                    statusCode: "COMPLETED",
                    results: [{data: counts(77)}],
                },
            });
        }).as("statisticsCommand");
        cy.intercept("GET", "**/commands/old-scope/status?order=desc&limit=1", {
            statusCode: 200,
            body: {items: [{"command@id": "old-scope", statusCode: "PENDING"}]},
        });

        cy.mount(<ScopeHarness/>);
        cy.contains("button", "Refresh Statistics").should("be.enabled").click();
        cy.wait("@statisticsCommand");
        cy.get('[data-testid="switch-scope"]').click({force: true});
        cy.contains("button", "Refresh Statistics", {timeout: 5000}).should("be.enabled");
        cy.contains(".MuiDataGrid-row", "Local Node").within(() => {
            cy.contains(".MuiDataGrid-cell", "77").should("exist");
        });
        cy.then(() => expect(node.getObservationById).not.to.have.been.called);
    });
});
