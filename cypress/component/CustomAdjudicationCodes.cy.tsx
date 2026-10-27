import React, {useState} from "react";
import AdjudicationSelect from "../../src/app/_components/adjudication/AdjudicationSelect";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import {AdjudicationCodes} from "../../src/lib/data/oscar/adjudication/models/AdjudicationConstants";
import {commonCustomCodes, CUSTOM_CODES_DEFINITION, findCustomCodesStream, parseCustomCodes, resolveAdjudicationCode} from "../../src/lib/data/oscar/adjudication/CustomAdjudicationCodes";
import {generateAdjudicationCommandJSON} from "../../src/lib/data/oscar/OSCARCommands";

function node(id: string, codes: unknown[] | undefined): any {
    const sources: any[] = [];
    return {
        sources,
        emit: (codes: unknown[]) => sources.forEach(source => source.emit(codes)),
        createRealtimeObservationSource: () => {
            let handler: (message: any) => void;
            const source = {
                closed: false,
                subscribe: (callback: (message: any) => void) => { handler = callback; },
                connect: async () => {},
                reset: async () => { source.closed = true; },
                emit: (codes: unknown[]) => handler?.({values: [{data: {codes: codes}}]}),
            };
            sources.push(source);
            return source;
        },
        id,
        getConnectedSystemsEndpoint: () => `https://${id}/api`,
        fetchDataStreamWithObservedProperty: async () => codes === undefined ? undefined : {
            searchObservations: async () => ({nextPage: async () => [{result: {codes}}]}),
        },
    };
}

function Form({nodes}: {nodes: any[]}) {
    const [code, setCode] = useState(AdjudicationCodes.codes[0]);
    return <LanguageProvider>
        <AdjudicationSelect adjCode={code} onSelect={setCode} nodes={nodes} />
        <button onClick={() => {
            const command = JSON.parse(generateAdjudicationCommandJSON("", code, [], "NONE", [], "obs1", ""));
            (window as any).submittedCode = command.parameters.adjudicationCode;
        }}>Submit</button>
        <span data-cy="selected-code">{code.code}</span>
    </LanguageProvider>;
}

describe("custom disposition choices", () => {
    beforeEach(() => localStorage.setItem("language", "en"));

    it("selects built-in or custom codes by number and submits the custom number", () => {
        const source = node("one", [{code: 12, label: "Local review"}, {code: 42, label: "Local review"}]);
        cy.mount(<Form nodes={[source]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 1:').should("exist");
        cy.contains('[role="option"]', 'Code 42: Local review').click();
        cy.get('[data-cy="selected-code"]').should("have.text", "42");
        cy.contains("button", "Submit").click();
        cy.window().its("submittedCode").should("equal", 42);
    });

    it("shows only custom meanings shared by all bulk target nodes", () => {
        const first = node("one", [{code: 12, label: "Shared"}, {code: 13, label: "First meaning"}]);
        const second = node("two", [{code: 12, label: "Shared"}, {code: 13, label: "Different meaning"}]);
        cy.mount(<Form nodes={[first, second]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 12: Shared').should("exist");
        cy.contains('[role="option"]', 'Code 13:').should("not.exist");
    });

    it("updates selected codes from MQTT and keeps its subscription when reopened", () => {
        const codes = [{code: 12, label: "Original"}];
        const source = node("one", codes);
        cy.mount(<Form nodes={[source]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 12: Original').click();
        cy.then(() => source.emit([{code: 42, label: "Updated"}]));
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 42: Updated').should("exist");
        cy.contains('[role="option"]', 'Code 12: Original').should("not.exist");
        cy.get('[data-cy="selected-code"]').should("have.text", "0");
        cy.then(() => expect(source.sources).to.have.length(1));
    });

    it("keeps built-ins available when a node has no custom-code stream", () => {
        cy.mount(<Form nodes={[node("old", undefined)]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 11:').click();
        cy.get('[data-cy="selected-code"]').should("have.text", "11");
    });

    it("adds later codes through MQTT without polling or reopening the dashboard selector", () => {
        cy.clock(Date.now(), ["setInterval", "clearInterval"]);
        const source = node("dashboard", []);
        const discover = cy.spy(source, "fetchDataStreamWithObservedProperty");
        cy.mount(<Form nodes={[source]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 11:').should("exist");
        cy.wrap(discover).should("have.been.calledOnce");
        cy.then(() => source.emit([{code: 42, label: "Added after dashboard opened"}]));
        cy.contains('[role="option"]', 'Code 42: Added after dashboard opened').should("exist");
        cy.tick(60000);
        cy.wrap(discover).should("have.been.calledOnce");
        cy.contains('[role="option"]', 'Code 42: Added after dashboard opened').click();
        cy.get('[data-cy="selected-code"]').should("have.text", "42");
    });

    it("receives the first observation through MQTT when the initial query is empty", () => {
        const source = node("dashboard", []);
        source.fetchDataStreamWithObservedProperty = async () => ({
            searchObservations: async () => ({nextPage: async () => []}),
        });
        cy.mount(<Form nodes={[source]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 11:').should("exist");
        cy.then(() => source.emit([{code: 12, label: "Published later"}]));
        cy.contains('[role="option"]', 'Code 12: Published later').should("exist");
    });

    it("does not overwrite MQTT updates with an older initial snapshot", () => {
        let resolveSnapshot: (data: any[]) => void;
        const snapshot = new Promise<any[]>(resolve => { resolveSnapshot = resolve; });
        const source = node("dashboard", []);
        const query = cy.stub().resolves({nextPage: () => snapshot});
        source.fetchDataStreamWithObservedProperty = async () => ({searchObservations: query});
        cy.mount(<Form nodes={[source]} />);
        cy.get('[role="combobox"]').click();
        cy.wrap(query).should("have.been.calledOnce");
        cy.then(() => source.emit([{code: 42, label: "Live update"}]));
        cy.contains('[role="option"]', 'Code 42: Live update').should("exist");
        cy.then(() => resolveSnapshot([{result: {codes: [{code: 12, label: "Old snapshot"}]}}]));
        cy.contains('[role="option"]', 'Code 42: Live update').should("exist");
        cy.contains('[role="option"]', 'Code 12: Old snapshot').should("not.exist");
    });

    it("applies bulk intersections again when either node publishes new choices", () => {
        const first = node("one", []);
        const second = node("two", []);
        cy.mount(<Form nodes={[first, second]} />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 11:').should("exist");
        cy.then(() => first.emit([{code: 42, label: "Shared live code"}]));
        cy.contains('[role="option"]', 'Code 42: Shared live code').should("not.exist");
        cy.then(() => second.emit([{code: 42, label: "Shared live code"}]));
        cy.contains('[role="option"]', 'Code 42: Shared live code').should("exist");
        cy.then(() => first.emit([]));
        cy.contains('[role="option"]', 'Code 42: Shared live code').should("not.exist");
    });

    it("discovers the single adjudicationCodes output", async () => {
        const source = node("one", []);
        const stream = {properties: {id: "adjudication-codes"}};
        const discover = cy.stub(source, "fetchDataStreamWithObservedProperty").resolves(stream);
        expect(await findCustomCodesStream(source)).to.equal(stream);
        expect(discover).to.have.been.calledOnceWithExactly(CUSTOM_CODES_DEFINITION);
    });

    it("does not leak codes when switching nodes", () => {
        const first = node("one", [{code: 12, label: "First node"}]);
        const second = node("two", [{code: 42, label: "Second node"}]);
        function Switcher() {
            const [source, setSource] = useState(first);
            return <><button onClick={() => setSource(second)}>Switch</button><Form nodes={[source]} /></>;
        }
        cy.mount(<Switcher />);
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 12: First node').click();
        cy.contains("button", "Switch").click();
        cy.get('[role="combobox"]').click();
        cy.contains('[role="option"]', 'Code 42: Second node').should("exist");
        cy.contains('[role="option"]', 'Code 12: First node').should("not.exist");
        cy.then(() => {
            expect(first.sources[0].closed).to.equal(true);
            first.emit([{code: 99, label: "Stale message"}]);
        });
        cy.contains('[role="option"]', 'Code 99: Stale message').should("not.exist");
    });

    it("filters invalid entries and preserves unknown historical code numbers", async () => {
        expect(parseCustomCodes([{code: 1, label: "Override"}, {code: -1, label: "Negative"},
            {code: 12, label: " "}, {code: 42, label: "Local"}])).to.deep.equal([
            {code: 42, label: "Local", group: "Custom"},
        ]);
        expect(resolveAdjudicationCode(100, []).code).to.equal(100);
        expect(commonCustomCodes([parseCustomCodes([{code: 12, label: "Local"}]), []])).to.deep.equal([]);
        expect(await findCustomCodesStream(node("old", undefined))).to.equal(undefined);
    });
});
