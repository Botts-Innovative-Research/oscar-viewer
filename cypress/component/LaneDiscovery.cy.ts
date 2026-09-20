import {discoverLanesIncrementally} from "../../src/lib/data/oscar/LaneDiscovery";

function laneEntry(node: any) {
    return {
        parentNode: node,
        laneName: "lane1",
        setLaneName(name: string) {
            this.laneName = name;
        },
        addDefaultConSysApis: cy.stub(),
    } as any;
}

describe("incremental lane discovery", () => {
    it("publishes a healthy node before an unavailable node settles", async () => {
        let rejectUnavailable: (reason?: unknown) => void = () => {};
        const unavailableRequest = new Promise<Map<string, any>>((_, reject) => {
            rejectUnavailable = reject;
        });

        const healthyNode: any = {
            name: "Healthy Node",
            fetchLaneSystemsAndSubsystems: async () =>
                new Map([["lane1", laneEntry(healthyNode)]]),
            fetchDataStreams: cy.stub().resolves(),
            fetchLaneControlStreams: cy.stub().resolves(),
        };
        const unavailableNode: any = {
            name: "Unavailable Node",
            fetchLaneSystemsAndSubsystems: () => unavailableRequest,
            fetchDataStreams: cy.stub().resolves(),
            fetchLaneControlStreams: cy.stub().resolves(),
        };
        const snapshots: Map<string, any>[] = [];
        let discoverySettled = false;

        const discovery = discoverLanesIncrementally(
            [healthyNode, unavailableNode],
            (laneMap) => snapshots.push(laneMap),
        ).finally(() => {
            discoverySettled = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(discoverySettled).to.equal(false);
        expect(snapshots).to.have.length(1);
        expect(snapshots[0].has("lane1")).to.equal(true);

        rejectUnavailable(new Error("node offline"));
        const result = await discovery;

        expect(result.laneMap.has("lane1")).to.equal(true);
        expect(result.failures).to.have.length(1);
        expect(result.failures[0].node).to.equal(unavailableNode);
    });

    it("loads a node's data and control metadata concurrently", async () => {
        let resolveData: () => void = () => {};
        let resolveControls: () => void = () => {};
        const dataRequest = new Promise<void>((resolve) => { resolveData = resolve; });
        const controlRequest = new Promise<void>((resolve) => { resolveControls = resolve; });
        const node: any = {
            name: "Local Node",
            fetchLaneSystemsAndSubsystems: async () =>
                new Map([["lane1", laneEntry(node)]]),
            fetchDataStreams: cy.stub().returns(dataRequest),
            fetchLaneControlStreams: cy.stub().returns(controlRequest),
        };

        const discovery = discoverLanesIncrementally([node], () => {});
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(node.fetchDataStreams).to.have.been.calledOnce;
        expect(node.fetchLaneControlStreams).to.have.been.calledOnce;

        resolveData();
        resolveControls();
        await discovery;
    });
});
