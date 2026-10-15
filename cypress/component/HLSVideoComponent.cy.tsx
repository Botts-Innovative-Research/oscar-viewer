import React from "react";
import HLSVideoComponent from "../../src/app/_components/lane-view/HLSVideoComponent";
import {buildLiveVideoUrl} from "../../src/app/_components/lane-view/LiveVideoUtils";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";

type Listener = (event: string, data?: any) => void;

class FakeHls {
    static Events = {
        ERROR: "hlsError",
        MANIFEST_PARSED: "hlsManifestParsed",
    };
    static instances: FakeHls[] = [];
    static supported = true;

    static isSupported() {
        return FakeHls.supported;
    }

    listeners = new Map<string, Listener>();
    config: Record<string, any>;
    loadSource = cy.stub();
    attachMedia = cy.stub();
    startLoad = cy.stub();
    stopLoad = cy.stub();
    recoverMediaError = cy.stub();
    swapAudioCodec = cy.stub();
    destroy = cy.stub();

    constructor(config: Record<string, any>) {
        this.config = config;
        FakeHls.instances.push(this);
    }

    on(event: string, callback: Listener) {
        this.listeners.set(event, callback);
    }

    emit(event: string, data?: any) {
        this.listeners.get(event)?.(event, data);
    }
}

const node = {
    address: "ignored.example",
    port: 443,
    isSecure: true,
    isDefaultNode: true,
    oshPathRoot: "/sensorhub/",
    bucketsEndpoint: "/video-files/",
    getBasicAuthHeader: () => ({}),
} as any;

const hlsLoader = () => Promise.resolve({default: FakeHls as any});

function mountPlayer(
    videoSource = "live\\lane-01\\index.m3u8",
    onRetry?: () => void,
    selectedNode = node,
    loader = hlsLoader,
) {
    return cy.mount(
        <LanguageProvider>
            <HLSVideoComponent
                videoSource={videoSource}
                selectedNode={selectedNode}
                hlsLoader={loader}
                onRetry={onRetry}
            />
        </LanguageProvider>,
    );
}

function currentHls(): Cypress.Chainable<FakeHls> {
    return cy.wrap(null).should(() => {
        expect(FakeHls.instances).to.have.length.greaterThan(0);
    }).then(() => FakeHls.instances[FakeHls.instances.length - 1]);
}

function dispatchMediaEvent(name: string): Cypress.Chainable<JQuery<HTMLVideoElement>> {
    return cy.get("video").then(($video) => {
        $video[0].dispatchEvent(new Event(name, {bubbles: false}));
        return $video;
    });
}

describe("live HLS video", () => {
    beforeEach(() => {
        localStorage.clear();
        FakeHls.instances = [];
        FakeHls.supported = true;
        cy.stub(HTMLMediaElement.prototype, "play").resolves();
    });

    it("shows a localized preparation state until a delayed manifest actually plays", () => {
        mountPlayer();

        cy.get('[data-testid="live-video-preparing"]')
            .should("contain.text", "Preparing live video")
            .and("contain.text", "waiting for a keyframe");

        currentHls().then((hls) => {
            expect(hls.loadSource).to.have.been.calledWith("/sensorhub/video-files/live/lane-01/index.m3u8");
            hls.emit(FakeHls.Events.MANIFEST_PARSED);
        });
        cy.get('[data-testid="live-video-preparing"]').should("exist");
        cy.get("video").trigger("playing", {force: true});
        cy.get('[data-testid="live-video-preparing"]').should("not.exist");
        cy.get('[data-testid="live-video-error"]').should("not.exist");
    });

    it("treats an initial manifest 404 as preparing and retries without throwing", () => {
        cy.clock();
        mountPlayer();

        let hls: FakeHls;
        currentHls().then((instance) => {
            hls = instance;
            hls.emit(FakeHls.Events.ERROR, {
                fatal: true,
                type: "networkError",
                error: new Error("manifest load failed (status 404)"),
            });
            expect(hls.loadSource).to.have.been.calledOnce;
        });
        cy.tick(749).then(() => {
            expect(hls.loadSource).to.have.been.calledOnce;
        });
        cy.tick(1).then(() => {
            expect(hls.loadSource).to.have.been.calledTwice;
            expect(hls.startLoad).to.have.been.calledOnce;
        });

        cy.get('[data-testid="live-video-preparing"]').should("exist");
        cy.get('[data-testid="live-video-error"]').should("not.exist");
    });

    it("bounds fatal media recovery, shows a terminal error, and supports manual retry", () => {
        cy.clock();
        mountPlayer();

        let hls: FakeHls;
        currentHls().then((instance) => {
            hls = instance;
        });
        [250, 500, 750].forEach((delay) => {
            cy.then(() => hls.emit(FakeHls.Events.ERROR, {
                fatal: true,
                type: "mediaError",
                error: new Error("decoder failed"),
            }));
            cy.tick(delay);
        });
        cy.then(() => {
            expect(hls.recoverMediaError).to.have.callCount(3);
            expect(hls.swapAudioCodec).to.have.been.calledOnce;

            hls.emit(FakeHls.Events.ERROR, {
                fatal: true,
                type: "mediaError",
                error: new Error("decoder still failing"),
            });
        });

        cy.get('[data-testid="live-video-error"]')
            .should("contain.text", "Live video could not be played");
        cy.contains("button", "Retry").click();
        cy.get('[data-testid="live-video-preparing"]').should("exist");
        cy.wrap(null).should(() => expect(FakeHls.instances).to.have.length(2));
        cy.then(() => expect(FakeHls.instances[0].destroy).to.have.been.calledOnce);
    });

    it("requests exactly one fresh server stream when terminal Retry is selected", () => {
        const onRetry = cy.stub();
        mountPlayer("live/lane-01/index.m3u8", onRetry);

        currentHls().then((hls) => hls.emit(FakeHls.Events.ERROR, {
            fatal: true,
            type: "otherError",
            error: new Error("stream expired"),
        }));
        cy.get('[data-testid="live-video-error"]').should("exist");
        cy.contains("button", "Retry").click();
        cy.then(() => {
            expect(onRetry).to.have.been.calledOnce;
            expect(FakeHls.instances).to.have.length(1);
        });
    });

    it("cancels pending retries and destroys HLS on unmount", () => {
        cy.clock();
        mountPlayer();

        let hls: FakeHls;
        currentHls().then((instance) => {
            hls = instance;
            hls.emit(FakeHls.Events.ERROR, {
                fatal: true,
                type: "networkError",
                error: new Error("manifest load failed (status 404)"),
            });
        });
        cy.mount(<div>Unmounted</div>);
        cy.tick(1_000);
        cy.then(() => {
            expect(hls.loadSource).to.have.been.calledOnce;
            expect(hls.destroy).to.have.been.calledOnce;
        });
    });

    it("keeps the native HLS fallback on the configured same-origin URL", () => {
        FakeHls.supported = false;
        cy.stub(HTMLMediaElement.prototype, "canPlayType").returns("probably");
        cy.stub(HTMLMediaElement.prototype, "load");
        mountPlayer("live\\native\\index.m3u8");

        cy.get("video")
            .should("have.attr", "src", "/sensorhub/video-files/live/native/index.m3u8")
            .trigger("loadedmetadata", {force: true});
        cy.then(() => expect(HTMLMediaElement.prototype.play).to.have.been.called);
        cy.then(() => expect(FakeHls.instances).to.have.length(0));
    });

    it("retries a transient native HLS startup error and cancels that retry on unmount", () => {
        cy.clock();
        FakeHls.supported = false;
        cy.stub(HTMLMediaElement.prototype, "canPlayType").returns("probably");
        const load = cy.stub(HTMLMediaElement.prototype, "load");
        mountPlayer("live/native/index.m3u8");

        dispatchMediaEvent("error");
        cy.tick(749).then(() => expect(load).to.have.been.calledOnce);
        cy.tick(1).then(() => expect(load).to.have.been.calledTwice);
        cy.get("video")
            .trigger("loadedmetadata", {force: true})
            .trigger("playing", {force: true});
        cy.get('[data-testid="live-video-error"]').should("not.exist");

        dispatchMediaEvent("error");
        cy.mount(<div>Unmounted</div>);
        let callsAfterUnmount = 0;
        cy.then(() => {
            callsAfterUnmount = load.callCount;
        });
        cy.tick(1_000).then(() => {
            expect(load.callCount).to.equal(callsAfterUnmount);
        });
    });

    it("does not turn an autoplay prompt into a false timeout error", () => {
        cy.clock();
        const play = HTMLMediaElement.prototype.play as any;
        play.onFirstCall().rejects({name: "NotAllowedError"});
        play.onSecondCall().returns(new Promise(() => undefined));
        mountPlayer();

        currentHls().then((hls) => hls.emit(FakeHls.Events.MANIFEST_PARSED));
        cy.contains("button", "Play").should("exist");
        cy.tick(60_000);
        cy.get('[data-testid="live-video-error"]').should("not.exist");
        cy.contains("button", "Play").click();
        cy.tick(45_000);
        cy.get('[data-testid="live-video-error"]').should("exist");
    });

    it("does not revive HLS after a delayed loader resolves past the preparation timeout", () => {
        cy.clock();
        let resolveLoader!: (library: {default: any}) => void;
        const delayedLoader = () => new Promise<{default: any}>((resolve) => {
            resolveLoader = resolve;
        });
        mountPlayer("live/lane-01/index.m3u8", undefined, node, delayedLoader);

        cy.tick(45_000);
        cy.get('[data-testid="live-video-error"]').should("exist");
        cy.then(() => resolveLoader({default: FakeHls as any}));
        cy.wrap(null).should(() => expect(FakeHls.instances).to.have.length(0));
    });

    it("ignores late native events and aborts the source after terminal failure", () => {
        cy.clock();
        FakeHls.supported = false;
        cy.stub(HTMLMediaElement.prototype, "canPlayType").returns("probably");
        const load = cy.stub(HTMLMediaElement.prototype, "load");
        const play = HTMLMediaElement.prototype.play as any;
        mountPlayer("live/native/index.m3u8");

        cy.tick(45_000);
        cy.get('[data-testid="live-video-error"]').should("exist");
        cy.get("video").should("not.have.attr", "src");
        cy.then(() => {
            expect(load).to.have.been.calledTwice;
            expect(play).not.to.have.been.called;
        });

        dispatchMediaEvent("loadedmetadata");
        dispatchMediaEvent("error");
        cy.tick(1_000);
        cy.then(() => {
            expect(load).to.have.been.calledTwice;
            expect(play).not.to.have.been.called;
        });
    });

    it("withholds node credentials from cross-origin HLS subresources", () => {
        const authenticatedNode = {
            ...node,
            getBasicAuthHeader: cy.stub().returns({Authorization: "Basic secret"}),
        };
        mountPlayer("live/lane-01/index.m3u8", undefined, authenticatedNode);

        currentHls().then((hls) => {
            const xhrSetup = hls.config.xhrSetup as (xhr: any, url: string) => void;
            const sameOriginXhr = {setRequestHeader: cy.stub(), withCredentials: false};
            xhrSetup(sameOriginXhr, `${window.location.origin}/sensorhub/video-files/live0.ts`);
            expect(sameOriginXhr.setRequestHeader)
                .to.have.been.calledWith("Authorization", "Basic secret");
            expect(sameOriginXhr.withCredentials).to.equal(true);

            const hostileXhr = {setRequestHeader: cy.stub(), withCredentials: true};
            xhrSetup(hostileXhr, "https://untrusted.example/segment.ts");
            expect(hostileXhr.setRequestHeader).not.to.have.been.called;
            expect(hostileXhr.withCredentials).to.equal(false);
        });
    });

    it("constructs configured and same-origin-safe playlist URLs", () => {
        expect(buildLiveVideoUrl("video-files\\live\\lane-01\\index.m3u8", node))
            .to.equal("/sensorhub/video-files/live/lane-01/index.m3u8");
        expect(buildLiveVideoUrl("https://untrusted.example/sensorhub/video-files/live/a.m3u8?x=1", node))
            .to.equal("/sensorhub/video-files/live/a.m3u8?x=1");
        expect(buildLiveVideoUrl("../live/lane-02/index.m3u8", {
            ...node,
            address: "remote.example",
            port: 8443,
            isDefaultNode: false,
        }))
            .to.equal("https://remote.example:8443/sensorhub/video-files/live/lane-02/index.m3u8");

        for (const hostilePath of [
            "%2e%2e/admin/index.m3u8",
            "%2E%2E%2Fadmin/index.m3u8",
            "%252e%252e/admin/index.m3u8",
            "safe%2f..%2fadmin/index.m3u8",
        ]) {
            const url = buildLiveVideoUrl(hostilePath, node);
            expect(url).to.equal("/sensorhub/video-files/admin/index.m3u8");
            expect(new URL(url, "https://oscar.local").pathname)
                .to.match(/^\/sensorhub\/video-files(?:\/|$)/);
        }

        expect(buildLiveVideoUrl("%E0%A4%A", node))
            .to.equal("/sensorhub/video-files");
    });
});
