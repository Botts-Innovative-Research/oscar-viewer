import {getUniqueVideoControlStreams} from "../../src/app/_components/lane-view/VideoStreamUtils";
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
