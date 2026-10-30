import {
    getUniqueVideoControlStreams,
    runAbortableWithTimeout,
    stopStreamAfterStartSettles,
} from "../../src/app/_components/lane-view/VideoStreamUtils";
import {HLS_VIDEO_DEF} from "../../src/lib/data/Constants";
import {attemptMediaPlayback} from "../../src/lib/media/MediaPlayback";

describe("video stream discovery", () => {
    it("waits safely when the refreshed lane has not been discovered yet", () => {
        expect(getUniqueVideoControlStreams(undefined)).to.deep.equal([]);
    });

    it("finds and de-duplicates HLS controls after lane discovery completes", () => {
        const hlsControl = {
            properties: {
                id: "video-control-1",
                controlledProperties: [{definition: HLS_VIDEO_DEF}],
            },
        };
        const nonVideoControl = {
            properties: {
                id: "other-control",
                controlledProperties: [{definition: "urn:test:other"}],
            },
        };

        expect(getUniqueVideoControlStreams({
            controlStreams: [hlsControl, hlsControl, nonVideoControl],
        } as any)).to.deep.equal([hlsControl]);
    });
});

describe("media playback", () => {
    it("reports autoplay policy rejection without throwing", async () => {
        const play = cy.stub().rejects({name: "NotAllowedError"});

        const result = await attemptMediaPlayback({play} as any);

        expect(result.status).to.equal("blocked");
        expect(play).to.have.been.calledOnce;
    });

    it("reports interrupted playback without throwing", async () => {
        const play = cy.stub().rejects({name: "AbortError"});

        const result = await attemptMediaPlayback({play} as any);

        expect(result.status).to.equal("interrupted");
    });

    it("preserves unexpected playback failures for diagnostics", async () => {
        const error = new Error("decoder failed");
        const play = cy.stub().rejects(error);

        const result = await attemptMediaPlayback({play} as any);

        expect(result.status).to.equal("failed");
        expect(result.error).to.equal(error);
    });
});

describe("video stream command sequencing", () => {
    it("waits for an in-flight start, stops once, then permits the replacement start", async () => {
        const events: string[] = [];
        let resolveOldStart: () => void = () => undefined;
        const oldStart = new Promise<void>((resolve) => {
            resolveOldStart = resolve;
        });
        const stop = cy.stub().callsFake(async () => {
            events.push("stop-old");
        });

        const cleanup = stopStreamAfterStartSettles(oldStart, () => true, stop);
        const replacement = cleanup.then(() => {
            events.push("start-new");
        });

        expect(events).to.deep.equal([]);
        expect(stop).not.to.have.been.called;
        resolveOldStart();
        await replacement;

        expect(events).to.deep.equal(["stop-old", "start-new"]);
        expect(stop).to.have.been.calledOnce;
    });

    it("does not stop a generation that was cancelled before launching", async () => {
        const stop = cy.stub().resolves();

        await stopStreamAfterStartSettles(Promise.resolve(), () => false, stop);

        expect(stop).not.to.have.been.called;
    });

    it("does not abort a dispatched start during cleanup and preserves server command order", async () => {
        const events: string[] = [];
        const controller = new AbortController();
        let resolveStart: (response: Response) => void = () => undefined;
        const pendingStart = runAbortableWithTimeout(
            controller,
            1_000,
            () => new Promise<Response>((resolve) => {
                resolveStart = resolve;
            }),
        );
        const stop = cy.stub().callsFake(async () => {
            events.push("stop-old");
        });
        const cleanup = stopStreamAfterStartSettles(pendingStart, () => true, stop);
        const replacement = cleanup.then(() => events.push("start-new"));

        await Promise.resolve();
        expect(controller.signal.aborted).to.equal(false);
        expect(events).to.deep.equal([]);
        expect(stop).not.to.have.been.called;

        resolveStart(new Response());
        await replacement;

        expect(controller.signal.aborted).to.equal(false);
        expect(events).to.deep.equal(["stop-old", "start-new"]);
        expect(stop).to.have.been.calledOnce;
    });

    it("times out a hung operation even when it ignores AbortSignal", async () => {
        const controller = new AbortController();
        let error: any = null;

        try {
            await runAbortableWithTimeout(
                controller,
                5,
                () => new Promise<Response>(() => undefined),
            );
        } catch (caught) {
            error = caught;
        }

        expect(controller.signal.aborted).to.equal(true);
        expect(error?.name).to.equal("AbortError");
    });

    it("allows replacement after a bounded stop times out", async () => {
        const events: string[] = [];
        const stop = async () => {
            const controller = new AbortController();
            try {
                await runAbortableWithTimeout(
                    controller,
                    5,
                    () => new Promise<Response>(() => undefined),
                );
            } catch {
                events.push("stop-timeout");
            }
        };

        await stopStreamAfterStartSettles(Promise.resolve(), () => true, stop);
        events.push("start-new");

        expect(events).to.deep.equal(["stop-timeout", "start-new"]);
    });
});
