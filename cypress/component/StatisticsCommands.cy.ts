import {
    DEFAULT_STATISTICS_COMMAND_TIMEOUT_MS,
    executeStatisticsCommand,
    getInlineStatisticsResult,
    getObservationStatisticsResult,
    StatisticsCommandError,
    StatisticsCommandTimeoutError,
} from "../../src/lib/data/oscar/StatisticsCommands";


function jsonResponse(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });
}

function testNode() {
    return {
        fetchLatestObservationWithFilter: cy.stub(),
        getBasicAuthHeader: () => ({Authorization: "Basic test"}),
        getConnectedSystemsEndpoint: () => "https://oscar.test/sensorhub/api",
        getObservationsApi: cy.stub(),
    } as any;
}

const controlStream = {
    properties: {
        id: "statistics-stream",
        "system@id": "oscar-system",
    },
} as any;

const noDelay = async () => undefined;

describe("statistics command lifecycle", () => {
    it("waits through pending and executing statuses until completed results are durable", async () => {
        const node = testNode();
        const send = cy.stub().resolves(jsonResponse({
            "command@id": "command-1",
            statusCode: "PENDING",
        }));
        const fetchStatus = cy.stub();
        fetchStatus.onFirstCall().resolves(jsonResponse({items: [{
            "command@id": "command-1",
            statusCode: "EXECUTING",
        }]}));
        fetchStatus.onSecondCall().resolves(jsonResponse({items: [{
            "command@id": "command-1",
            statusCode: "ACCEPTED",
        }]}));
        fetchStatus.onThirdCall().resolves(jsonResponse({items: [{
            "command@id": "command-1",
            statusCode: "COMPLETED",
            results: [{data: {numOccupancies: 7}}],
        }]}));

        const status = await executeStatisticsCommand(node, controlStream, "{}", {
            delayImpl: noDelay,
            fetchImpl: fetchStatus,
            pollIntervalMs: 0,
            sendCommandImpl: send,
            timeoutMs: 1000,
        });

        expect(status.statusCode).to.equal("COMPLETED");
        expect(getInlineStatisticsResult(status)).to.deep.equal({numOccupancies: 7});
        expect(fetchStatus).to.have.been.calledThrice;
        expect(fetchStatus.firstCall.args[0]).to.equal(
            "https://oscar.test/sensorhub/api/systems/oscar-system/controlstreams/statistics-stream/commands/command-1/status?order=desc&limit=1",
        );
    });

    it("accepts the legacy ACCEPTED terminal status only when it carries results", async () => {
        const send = cy.stub().resolves(jsonResponse({
            "command@id": "legacy-command",
            statusCode: "ACCEPTED",
            results: [{data: {numOccupancies: 3}}],
        }));
        const fetchStatus = cy.stub();

        const status = await executeStatisticsCommand(testNode(), controlStream, "{}", {
            fetchImpl: fetchStatus,
            sendCommandImpl: send,
            timeoutMs: 1000,
        });

        expect(getInlineStatisticsResult(status)).to.deep.equal({numOccupancies: 3});
        expect(fetchStatus).not.to.have.been.called;
    });

    it("rejects a durable failed status instead of displaying placeholder counts", async () => {
        const send = cy.stub().resolves(jsonResponse({
            "command@id": "command-2",
            statusCode: "PENDING",
        }));
        const fetchStatus = cy.stub().resolves(jsonResponse({items: [{
            "command@id": "command-2",
            message: "archive query failed",
            statusCode: "FAILED",
        }]}));

        let failure: unknown;
        try {
            await executeStatisticsCommand(testNode(), controlStream, "{}", {
                delayImpl: noDelay,
                fetchImpl: fetchStatus,
                pollIntervalMs: 0,
                sendCommandImpl: send,
                timeoutMs: 1000,
            });
        } catch (error) {
            failure = error;
        }

        expect(failure).to.be.instanceOf(StatisticsCommandError);
        expect((failure as Error).message).to.equal("archive query failed");
    });

    it("uses the exact observation ID returned by the completed command", async () => {
        const node = testNode();
        const getObservationById = cy.stub().resolves({
            properties: {result: {allTime: {numOccupancies: 12}}},
        });
        node.getObservationsApi.returns({getObservationById});

        const result = await getObservationStatisticsResult(node, {
            statusCode: "COMPLETED",
            results: [{"observation@id": "observation-42"}],
        });

        expect(result).to.deep.equal({allTime: {numOccupancies: 12}});
        expect(getObservationById).to.have.been.calledOnceWith("observation-42");
        expect(node.fetchLatestObservationWithFilter).not.to.have.been.called;
    });

    it("never converts a pending response without inline data into zero statistics", () => {
        let failure: unknown;
        try {
            getInlineStatisticsResult({
                "command@id": "command-3",
                statusCode: "PENDING",
            });
        } catch (error) {
            failure = error;
        }

        expect(failure).to.be.instanceOf(StatisticsCommandError);
        expect((failure as Error).message)
            .to.equal("Completed statistics command did not include inline results");
    });

    it("enforces a configurable timeout while retaining a production guard of at least 15 minutes", async () => {
        expect(DEFAULT_STATISTICS_COMMAND_TIMEOUT_MS).to.be.at.least(15 * 60 * 1000);
        const send = cy.stub().resolves(jsonResponse({
            "command@id": "command-4",
            statusCode: "PENDING",
        }));
        const fetchStatus = cy.stub().callsFake(() => Promise.resolve(jsonResponse({items: [{
                "command@id": "command-4",
                statusCode: "PENDING",
            }]})));

        let failure: unknown;
        try {
            await executeStatisticsCommand(testNode(), controlStream, "{}", {
                fetchImpl: fetchStatus,
                pollIntervalMs: 1,
                sendCommandImpl: send,
                timeoutMs: 15,
            });
        } catch (error) {
            failure = error;
        }

        expect(failure).to.be.instanceOf(StatisticsCommandTimeoutError);
    });

    it("aborts an in-flight pending command when its view is closed", async () => {
        const abortController = new AbortController();
        const send = cy.stub().resolves(jsonResponse({
            "command@id": "command-5",
            statusCode: "PENDING",
        }));
        const fetchStatus = cy.stub();

        let failure: unknown;
        try {
            await executeStatisticsCommand(testNode(), controlStream, "{}", {
                delayImpl: async () => abortController.abort(
                    new DOMException("view closed", "AbortError"),
                ),
                fetchImpl: fetchStatus,
                pollIntervalMs: 0,
                sendCommandImpl: send,
                signal: abortController.signal,
            });
        } catch (error) {
            failure = error;
        }

        expect((failure as Error).name).to.equal("AbortError");
        expect(send).to.have.been.calledOnce;
        expect(fetchStatus).not.to.have.been.called;
    });
});
