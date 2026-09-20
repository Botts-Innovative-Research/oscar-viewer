import {getUniqueVideoControlStreams} from "../../src/app/_components/lane-view/VideoStreamUtils";
import {HLS_VIDEO_DEF} from "../../src/lib/data/Constants";

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
