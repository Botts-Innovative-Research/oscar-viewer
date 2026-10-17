import React from "react";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import RetainedEventMedia from "../../src/app/_components/event-preview/RetainedEventMedia";
import {
    fetchRetainedEventMedia,
    fetchRetainedMediaAsset,
    MAX_RETAINED_CATALOG_BYTES,
    RetainedEventMediaResponse,
    RetainedMediaError,
    RetainedMediaFetch,
} from "../../src/lib/media/RetainedMedia";

const EVENT_ID = "123e4567-e89b-42d3-a456-426614174000";
const CAMERA_UID = "urn:osh:sensor:camera:lane-01:approach";
const POSITIONS = ["FIRST", "QUARTER", "MIDDLE", "THREE_QUARTERS", "LAST"] as const;
const JPEG_BYTES = Uint8Array.from(atob(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////"
    + "2wBDAf//////////////////////////////////////////////////////////////////////////////////////"
    + "wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/"
    + "9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAA"
    + "AAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAA"
    + "AAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABB//8QA"
    + "FBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QA"
    + "FBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
), character => character.charCodeAt(0));

const node = {
    address: "oscar.example",
    port: 8443,
    isSecure: true,
    isDefaultNode: true,
    oshPathRoot: "/sensorhub",
    bucketsEndpoint: "/buckets",
    getBasicAuthHeader: () => ({Authorization: "Basic dGVzdDp0ZXN0"}),
} as any;

function responseFixture(sourceState: "PRESERVED_FOR_ROLLBACK" | "DELETED" = "DELETED"):
RetainedEventMediaResponse {
    const manifestAssets = POSITIONS.map((position, index) => ({
        position,
        contentType: "image/jpeg" as const,
        sha256: String(index + 1).repeat(64).substring(0, 64),
        bytes: JPEG_BYTES.length,
        width: 1,
        height: 1,
        sourceFrameOrdinal: index * 10,
        sourcePts: index * 25,
        sourcePtsSeconds: index * 2.5,
        state: "PUBLISHED" as const,
    }));
    return {
        schemaVersion: 1,
        eventId: EVENT_ID,
        mediaSets: [{
            manifestPath: `media/${EVENT_ID}/camera-token/manifest.json`,
            manifest: {
                schemaVersion: 1,
                mediaSetId: "a".repeat(64),
                eventId: EVENT_ID,
                laneUid: "urn:osh:system:lane:lane-01",
                cameraUid: CAMERA_UID,
                createdAt: "2026-10-17T12:00:00Z",
                jpegQuality: 85,
                lifecycleState: "AVAILABLE",
                hold: {active: false, reason: "", placedAt: null},
                source: {
                    objectKey: "videos/lane-01/source.mp4",
                    sha256: "f".repeat(64),
                    bytes: 1000,
                    codec: "h264",
                    durationMicros: 10_000_000,
                    rollbackDeleteAfter: "2026-10-24T12:00:00Z",
                    state: sourceState,
                },
                assets: manifestAssets,
            },
            assets: manifestAssets.map((asset, index) => ({
                asset,
                path: `media/${EVENT_ID}/camera-token/frame-0${index + 1}.jpg`,
            })),
        }],
    };
}

function responseJson(payload: unknown, status = 200): Response {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });
}

function jpegResponse(): Response {
    return new Response(new Blob([JPEG_BYTES], {type: "image/jpeg"}), {status: 200});
}

function mountMedia(fetchImpl: RetainedMediaFetch) {
    return cy.mount(
        <LanguageProvider>
            <RetainedEventMedia
                eventId={EVENT_ID}
                selectedNode={node}
                videos={["videos/lane-01/source.mp4"]}
                modeType="details"
                startTime="2026-10-17T12:00:00Z"
                endTime="2026-10-17T12:00:10Z"
                syncTime={0}
                fetchImpl={fetchImpl}
            />
        </LanguageProvider>,
    );
}

describe("retained event media", () => {
    beforeEach(() => {
        localStorage.clear();
        cy.stub(HTMLMediaElement.prototype, "play").resolves();
    });

    it("queries the authenticated event API first and validates its five-frame contract", () => {
        const payload = responseFixture();
        const fetchImpl = cy.stub().callsFake((input: RequestInfo | URL, init?: RequestInit) => {
            expect(String(input)).to.equal(`/sensorhub/buckets/videos/media/${EVENT_ID}`);
            expect(init?.credentials).to.equal("include");
            expect(init?.cache).to.equal("no-store");
            expect((init?.headers as Record<string, string>).Authorization)
                .to.equal("Basic dGVzdDp0ZXN0");
            return Promise.resolve(responseJson(payload));
        }) as unknown as RetainedMediaFetch;

        return fetchRetainedEventMedia(EVENT_ID, node, fetchImpl).then(result => {
            expect(result?.eventId).to.equal(EVENT_ID);
            expect(result?.mediaSets).to.have.length(1);
            expect(result?.mediaSets[0].assets.map(asset => asset.asset.position))
                .to.deep.equal(POSITIONS);
        });
    });

    it("rejects incomplete or non-event-scoped API manifests", () => {
        const payload = responseFixture();
        payload.mediaSets[0].assets[4].path = "media/another-event/camera-token/frame-05.jpg";
        const fetchImpl = (() => Promise.resolve(responseJson(payload))) as RetainedMediaFetch;

        return fetchRetainedEventMedia(EVENT_ID, node, fetchImpl).then(
            () => { throw new Error("Expected the invalid retained-media response to be rejected"); },
            error => {
                expect(error).to.be.instanceOf(RetainedMediaError);
                expect((error as RetainedMediaError).code).to.equal("invalid-response");
            },
        );
    });

    it("stops an oversized catalog body at the transport boundary", () => {
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array(MAX_RETAINED_CATALOG_BYTES));
                controller.enqueue(new Uint8Array([0x7b]));
            },
            cancel() { cancelled = true; },
        });
        const fetchImpl = (() => Promise.resolve(new Response(stream, {
            status: 200,
            headers: {"Content-Type": "application/json"},
        }))) as RetainedMediaFetch;

        return fetchRetainedEventMedia(EVENT_ID, node, fetchImpl).then(
            () => { throw new Error("Expected the oversized catalog response to be rejected"); },
            error => {
                expect(error).to.be.instanceOf(RetainedMediaError);
                expect((error as RetainedMediaError).code).to.equal("invalid-response");
                expect(cancelled).to.equal(true);
            },
        );
    });

    it("stops a retained frame as soon as it exceeds the manifest byte count", () => {
        const asset = responseFixture().mediaSets[0].assets[0];
        let cancelled = false;
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array(asset.asset.bytes + 1));
            },
            cancel() { cancelled = true; },
        });
        const fetchImpl = (() => Promise.resolve(new Response(stream, {
            status: 200,
            headers: {"Content-Type": "image/jpeg"},
        }))) as RetainedMediaFetch;

        return fetchRetainedMediaAsset(asset, EVENT_ID, node, fetchImpl).then(
            () => { throw new Error("Expected the oversized retained frame to be rejected"); },
            error => {
                expect(error).to.be.instanceOf(RetainedMediaError);
                expect((error as RetainedMediaError).code).to.equal("invalid-asset");
                expect(cancelled).to.equal(true);
            },
        );
    });

    it("renders a labeled, keyboard-operable five-frame gallery and source metadata", () => {
        const payload = responseFixture();
        const fetchImpl = cy.stub().callsFake((input: RequestInfo | URL) => {
            const url = String(input);
            return Promise.resolve(url.endsWith(`/media/${EVENT_ID}`)
                ? responseJson(payload)
                : jpegResponse());
        }) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get('[data-testid="retained-media-gallery"]').should("be.visible");
        cy.get('[data-testid="retained-media-camera-label"]')
            .should("contain.text", `Camera: ${CAMERA_UID}`);
        cy.get('[data-testid="retained-media-thumbnail"]').should("have.length", 5);
        cy.get('[data-testid="retained-media-main-image"]')
            .should("have.attr", "alt")
            .and("contain", CAMERA_UID);
        cy.then(() => expect(fetchImpl).to.have.callCount(2));
        cy.get('[data-testid="retained-media-thumbnail"]').first()
            .should("have.attr", "aria-pressed", "true");
        cy.get('[data-testid="retained-media-frame-metadata"]')
            .should("contain.text", "Source frame 0")
            .and("contain.text", "00:00.000");
        cy.get('[data-testid="retained-media-thumbnail"]').last()
            .focus()
            .should("have.focus")
            .click();
        cy.then(() => expect(fetchImpl).to.have.callCount(3));
        cy.get('[data-testid="retained-media-frame-metadata"]')
            .should("contain.text", "Source frame 40")
            .and("contain.text", "00:10.000");
    });

    it("rejects a retained frame that exceeds its decoded-pixel budget", () => {
        const oversizedFrame = responseFixture();
        oversizedFrame.mediaSets[0].manifest.assets[0].width = 6000;
        oversizedFrame.mediaSets[0].manifest.assets[0].height = 6000;
        oversizedFrame.mediaSets[0].assets[0].asset.width = 6000;
        oversizedFrame.mediaSets[0].assets[0].asset.height = 6000;
        const fetchImpl = (() => Promise.resolve(responseJson(oversizedFrame))) as RetainedMediaFetch;

        return fetchRetainedEventMedia(EVENT_ID, node, fetchImpl).then(
            () => { throw new Error("Expected the oversized retained-media response to be rejected"); },
            error => {
                expect(error).to.be.instanceOf(RetainedMediaError);
                expect((error as RetainedMediaError).code).to.equal("invalid-response");
            },
        );
    });

    it("rejects a multi-camera response that exceeds the event-wide byte budget", () => {
        const payload = responseFixture();
        const first = payload.mediaSets[0];
        first.manifest.assets.forEach(asset => { asset.bytes = 10 * 1024 * 1024; });
        first.assets.forEach(asset => { asset.asset.bytes = 10 * 1024 * 1024; });
        const second = structuredClone(first);
        second.manifest.mediaSetId = "b".repeat(64);
        second.manifest.cameraUid = `${CAMERA_UID}:second`;
        second.manifestPath = second.manifestPath.replace("camera-token", "camera-token-2");
        second.assets.forEach(asset => {
            asset.path = asset.path.replace("camera-token", "camera-token-2");
        });
        payload.mediaSets.push(second);
        const fetchImpl = (() => Promise.resolve(responseJson(payload))) as RetainedMediaFetch;

        return fetchRetainedEventMedia(EVENT_ID, node, fetchImpl).then(
            () => { throw new Error("Expected the oversized event response to be rejected"); },
            error => {
                expect(error).to.be.instanceOf(RetainedMediaError);
                expect((error as RetainedMediaError).code).to.equal("invalid-response");
            },
        );
    });

    it("isolates a missing frame while leaving the other camera evidence usable", () => {
        const payload = responseFixture();
        const fetchImpl = cy.stub().callsFake((input: RequestInfo | URL) => {
            const url = String(input);
            if (url.endsWith(`/media/${EVENT_ID}`)) return Promise.resolve(responseJson(payload));
            if (url.endsWith("frame-03.jpg")) return Promise.resolve(new Response("", {status: 404}));
            return Promise.resolve(jpegResponse());
        }) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get('[data-testid="retained-media-thumbnail"]').eq(2).click();
        cy.get('[data-testid="retained-media-thumbnail-error-2"]').should("be.visible");
        cy.get('[data-testid="retained-media-frame-error"]')
            .should("contain.text", "missing or could not be decoded");
        cy.get('[data-testid="retained-media-thumbnail"]').first().click();
        cy.get('[data-testid="retained-media-main-image"]').should("be.visible");
    });

    it("uses the existing MP4 player only after a retained-media 404", () => {
        const fetchImpl = cy.stub().callsFake(() =>
            Promise.resolve(responseJson({message: "not found"}, 404))) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get("video source")
            .should("have.attr", "src")
            .and("contain", "/sensorhub/buckets/videos/lane-01/source.mp4");
        cy.get('[data-testid="retained-media-gallery"]').should("not.exist");
        cy.then(() => expect(fetchImpl).to.have.been.calledOnce);
    });

    it("warns on API failure and preserves the legacy video fallback", () => {
        const fetchImpl = cy.stub().callsFake(() =>
            Promise.resolve(responseJson({message: "failure"}, 503))) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get('[data-testid="retained-media-api-error"]')
            .should("contain.text", "could not be loaded");
        cy.get("video source").should("exist");
    });

    it("bounds a stalled API request and offers the legacy fallback", () => {
        cy.clock();
        const fetchImpl = cy.stub().callsFake((_input: RequestInfo | URL, init?: RequestInit) =>
            new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    const error = new Error("aborted");
                    error.name = "AbortError";
                    reject(error);
                }, {once: true});
            })) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get('[data-testid="retained-media-loading"]').should("be.visible");
        cy.tick(10_000);
        cy.get('[data-testid="retained-media-api-error"]').should("be.visible");
        cy.get("video source").should("exist");
    });

    it("keeps the hot source player below retained evidence during rollback grace", () => {
        const payload = responseFixture("PRESERVED_FOR_ROLLBACK");
        const fetchImpl = cy.stub().callsFake((input: RequestInfo | URL) =>
            Promise.resolve(String(input).endsWith(`/media/${EVENT_ID}`)
                ? responseJson(payload)
                : jpegResponse())) as unknown as RetainedMediaFetch;

        mountMedia(fetchImpl);
        cy.get('[data-testid="retained-media-gallery"]').should("be.visible");
        cy.get('[data-testid="retained-media-source-video"]')
            .should("contain.text", "Original video")
            .find("video source")
            .should("exist");
    });
});
