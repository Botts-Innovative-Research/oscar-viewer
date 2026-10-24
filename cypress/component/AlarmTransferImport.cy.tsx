import React from "react";
import AlarmTransferImport, {
    AlarmTransferImportProps,
} from "../../src/app/_components/alarm-transfer/AlarmTransferImport";
import {LanguageProvider} from "../../src/app/contexts/LanguageContext";
import {
    ALARM_TRANSFER_SCHEMA,
    ALARM_TRANSFER_VERSION,
    AlarmTransferDocument,
    encodeAlarmTransfer,
} from "../../src/lib/data/oscar/AlarmQrTransfer";

function transferDocument(): AlarmTransferDocument {
    return {
        payload: {
            schema: ALARM_TRANSFER_SCHEMA,
            version: ALARM_TRANSFER_VERSION,
            exportedAt: "2026-10-16T12:00:00.000Z",
            exportProfile: "qr-downsampled",
            source: {nodeId: "node-1", nodeName: "Test Node", laneId: "lane-1"},
            event: {
                occupancyId: "42",
                observationId: "123e4567-e89b-42d3-a456-426614174000",
                startTime: "2026-10-16T11:59:00.000Z",
                endTime: "2026-10-16T12:00:00.000Z",
                status: "Gamma",
            },
            series: {
                timeOrigin: "2026-10-16T11:59:00.000Z",
                gamma: {originalCount: 0, exportedCount: 0, points: [], unit: "cps", downsampled: false},
                neutron: {originalCount: 0, exportedCount: 0, points: [], unit: "cps", downsampled: false},
                threshold: {originalCount: 0, exportedCount: 0, points: [], unit: "cps", downsampled: false},
                fullResolutionSha256: "a".repeat(64),
            },
            authenticity: {signed: false, notice: "integrity-only"},
        },
        integrity: {algorithm: "SHA-256", digest: "b".repeat(64)},
        transport: "OSCAR-ALARM:1:TEST",
    };
}

interface FakeScannerInstance {
    $overlay: HTMLDivElement;
    video: HTMLVideoElement;
    onDecode: (result: {data: string; cornerPoints: []}) => void;
    options: any;
    start: sinon.SinonStub;
    stop: sinon.SinonStub;
    pause: sinon.SinonStub;
    destroy: sinon.SinonStub;
    setCamera: sinon.SinonStub;
    trackStop: sinon.SinonStub;
    visibleAtConstruction: boolean;
    boundsAtConstruction: DOMRect;
}

function scannerHarness(startFailure?: unknown | ((instanceIndex: number) => unknown)) {
    const instances: FakeScannerInstance[] = [];
    const cameras = [
        {id: "rear", label: "Rear camera"},
        {id: "front", label: "Front camera"},
    ];

    const createScanner: NonNullable<AlarmTransferImportProps["createScanner"]> = (video, onDecode, options) => {
        let deviceId = "rear";
        const trackStop = Cypress.sinon.stub();
        const track = {
            label: "Rear camera",
            stop: trackStop,
            getSettings: () => ({deviceId, width: 1920, height: 1080}),
        };
        Object.defineProperty(video, "videoWidth", {configurable: true, value: 1920});
        Object.defineProperty(video, "videoHeight", {configurable: true, value: 1080});
        Object.defineProperty(video, "srcObject", {
            configurable: true,
            writable: true,
            value: {
                getTracks: () => [track],
                getVideoTracks: () => [track],
            } as unknown as MediaStream,
        });
        const overlay = document.createElement("div");
        overlay.className = "scan-region-highlight";
        video.parentElement?.insertBefore(overlay, video.nextSibling);

        const instance: FakeScannerInstance = {
            $overlay: overlay,
            video,
            onDecode: onDecode as FakeScannerInstance["onDecode"],
            options,
            start: Cypress.sinon.stub(),
            stop: Cypress.sinon.stub(),
            pause: Cypress.sinon.stub().resolves(true),
            destroy: Cypress.sinon.stub(),
            setCamera: Cypress.sinon.stub().callsFake((nextDeviceId: string) => {
                deviceId = nextDeviceId;
                track.label = cameras.find(camera => camera.id === deviceId)?.label ?? "Camera";
                return Promise.resolve();
            }),
            trackStop,
            visibleAtConstruction: getComputedStyle(video).display !== "none",
            boundsAtConstruction: video.getBoundingClientRect(),
        };
        const failure = typeof startFailure === "function"
            ? startFailure(instances.length)
            : startFailure;
        if (failure !== undefined) instance.start.rejects(failure as Error);
        else instance.start.resolves();
        instances.push(instance);
        return instance;
    };

    return {
        instances,
        props: {
            createScanner,
            listCameras: Cypress.sinon.stub().resolves(cameras),
        } satisfies AlarmTransferImportProps,
    };
}

function mountImport(props: AlarmTransferImportProps) {
    return cy.mount(
        <LanguageProvider>
            <AlarmTransferImport {...props}/>
        </LanguageProvider>,
    );
}

describe("AlarmTransferImport live camera scanner", () => {
    beforeEach(() => {
        window.localStorage.setItem("language", "en");
    });

    it("renders the sized video before constructing one scanner and uses a native-pixel scan region", () => {
        const harness = scannerHarness();
        mountImport(harness.props);

        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "status")
            .and("contain.text", "idle");
        cy.get('[data-testid="alarm-qr-camera-video"]').should("not.be.visible");
        cy.contains("button", "Start camera scan").then(button => {
            button[0].click();
            button[0].click();
        });

        cy.wrap(null).should(() => {
            expect(harness.instances).to.have.length(1);
            const scanner = harness.instances[0];
            expect(scanner.visibleAtConstruction).to.equal(true);
            expect(scanner.boundsAtConstruction.width).to.be.greaterThan(0);
            expect(scanner.boundsAtConstruction.height).to.be.greaterThan(0);
            expect(scanner.options.maxScansPerSecond).to.equal(10);
            const region = scanner.options.calculateScanRegion(scanner.video);
            expect(region).to.deep.equal({x: 488, y: 68, width: 945, height: 945});
            expect(region).not.to.have.property("downScaledWidth");
            expect(region).not.to.have.property("downScaledHeight");
        });
        cy.get('[data-testid="alarm-qr-camera-video"]')
            .should("be.visible")
            .and("have.css", "object-fit", "contain");
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Scanning");
        cy.get(".scan-region-highlight").should("have.length", 1);
    });

    it("refuses to construct a scanner against a zero-sized preview", () => {
        const harness = scannerHarness();
        mountImport(harness.props);
        cy.get('[data-testid="alarm-qr-camera-video"]').then(video => {
            Cypress.sinon.stub(video[0], "getBoundingClientRect").returns({
                x: 0,
                y: 0,
                width: 0,
                height: 0,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                toJSON: () => ({}),
            });
        });
        cy.contains("button", "Start camera scan").click();

        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "must be visible");
        cy.then(() => expect(harness.instances).to.have.length(0));
    });

    it("latches and pauses the first detection before validation, then cleans up on success", () => {
        const harness = scannerHarness();
        let resolveDecode!: (document: AlarmTransferDocument) => void;
        const decodeTransport = Cypress.sinon.stub().returns(new Promise<AlarmTransferDocument>(resolve => {
            resolveDecode = resolve;
        }));
        mountImport({...harness.props, decodeTransport});
        cy.contains("button", "Start camera scan").click();
        cy.wrap(null).should(() => expect(harness.instances).to.have.length(1));

        cy.then(() => {
            const scanner = harness.instances[0];
            scanner.onDecode({data: "first", cornerPoints: []});
            scanner.onDecode({data: "duplicate", cornerPoints: []});
            expect(scanner.pause).to.have.been.calledOnceWithExactly(true);
        });
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Validating");
        cy.wrap(null).should(() => expect(decodeTransport).to.have.been.calledOnceWithExactly("first"));
        cy.then(() => resolveDecode(transferDocument()));
        cy.contains("The alarm data passed its SHA-256 integrity check").should("be.visible");
        cy.then(() => {
            const scanner = harness.instances[0];
            expect(scanner.stop).to.have.been.calledOnce;
            expect(scanner.destroy).to.have.been.calledOnce;
            expect(scanner.trackStop).to.have.been.calledOnce;
            expect(scanner.video.srcObject).to.equal(null);
        });
    });

    it("stops tracks on user stop and on unmount, including a scanner still starting", () => {
        const harness = scannerHarness();
        let rerender!: (component: React.ReactNode) => Cypress.Chainable<unknown>;
        mountImport(harness.props).then(result => {
            rerender = result.rerender;
        });
        cy.contains("button", "Start camera scan").click();
        cy.wrap(null).should(() => expect(harness.instances).to.have.length(1));
        cy.then(() => {
            Object.defineProperty(harness.instances[0].$overlay, "getAnimations", {
                configurable: true,
                value: () => { throw new Error("animation cleanup unavailable"); },
            });
        });
        cy.contains("button", "Stop camera scan").click();
        cy.get(".scan-region-highlight").should("not.exist");
        cy.then(() => {
            expect(harness.instances[0].stop).to.have.been.calledOnce;
            expect(harness.instances[0].destroy).to.have.been.calledOnce;
            expect(harness.instances[0].trackStop).to.have.been.calledOnce;
        });

        cy.contains("button", "Start camera scan").click();
        cy.wrap(null).should(() => expect(harness.instances).to.have.length(2));
        cy.get(".scan-region-highlight").should("have.length", 1);
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Scanning");
        cy.then(() => rerender(<div/>));
        cy.get(".scan-region-highlight").should("not.exist");
        cy.then(() => {
            expect(harness.instances[1].destroy).to.have.been.calledOnce;
            expect(harness.instances[1].trackStop).to.have.been.calledOnce;
        });
    });

    it("lists multiple cameras, reports the active resolution, and switches devices", () => {
        const harness = scannerHarness();
        mountImport(harness.props);
        cy.contains("button", "Start camera scan").click();

        cy.get('[data-testid="alarm-qr-active-camera"]')
            .should("contain.text", "Rear camera")
            .and("contain.text", "1920 × 1080");
        cy.get('[data-testid="alarm-qr-camera-selector"]').select("front");
        cy.then(() => expect(harness.instances[0].setCamera).to.have.been.calledOnceWithExactly("front"));
        cy.get('[data-testid="alarm-qr-active-camera"]').should("contain.text", "Front camera");
    });

    it("ignores both library no-code forms and surfaces a real decoder error", () => {
        const harness = scannerHarness();
        mountImport(harness.props);
        cy.contains("button", "Start camera scan").click();
        cy.wrap(null).should(() => expect(harness.instances).to.have.length(1));

        cy.then(() => harness.instances[0].options.onDecodeError("No QR code found"));
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Scanning");
        cy.then(() => harness.instances[0].options.onDecodeError("Scanner error: No QR code found"));
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Scanning");
        cy.then(() => harness.instances[0].options.onDecodeError(new Error("decoder worker crashed")));
        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "decoder worker crashed");
        cy.then(() => expect(harness.instances[0].destroy).to.have.been.calledOnce);
    });

    it("shows actionable permission feedback in the accessible scanner status and allows retry", () => {
        const harness = scannerHarness(new Error("Camera not found."));
        const getCameraPermissionState = Cypress.sinon.stub().resolves("denied" as PermissionState);
        mountImport({...harness.props, getCameraPermissionState});

        cy.contains("button", "Start camera scan").click();
        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "Camera permission was denied")
            .and("contain.text", "browser settings");
        cy.contains("button", "Start camera scan").should("be.enabled");
        cy.then(() => {
            expect(getCameraPermissionState).to.have.been.calledOnce;
            expect(harness.instances[0].destroy).to.have.been.calledOnce;
            expect(harness.instances[0].trackStop).to.have.been.calledOnce;
        });
    });

    it("distinguishes an unavailable camera from denied permission", () => {
        const harness = scannerHarness(new Error("Camera not found."));
        const getCameraPermissionState = Cypress.sinon.stub().resolves("granted" as PermissionState);
        mountImport({...harness.props, getCameraPermissionState});
        cy.contains("button", "Start camera scan").click();

        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "No usable camera was found")
            .and("not.contain.text", "permission was denied");
    });

    it("recognizes a direct NotAllowedError when permission lookup is unavailable", () => {
        const harness = scannerHarness(new DOMException("The request is not allowed", "NotAllowedError"));
        const getCameraPermissionState = Cypress.sinon.stub().rejects(new Error("Permissions API unavailable"));
        mountImport({...harness.props, getCameraPermissionState});
        cy.contains("button", "Start camera scan").click();

        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("have.attr", "role", "alert")
            .and("contain.text", "Camera permission was denied");
        cy.then(() => expect(getCameraPermissionState).to.have.been.calledOnce);
    });

    it("does not let a stale permission lookup stop a successful retry", () => {
        const harness = scannerHarness(index => index === 0 ? new Error("Camera not found.") : undefined);
        let resolvePermission!: (state: PermissionState) => void;
        const getCameraPermissionState = Cypress.sinon.stub().returns(
            new Promise<PermissionState>(resolve => { resolvePermission = resolve; }),
        );
        mountImport({...harness.props, getCameraPermissionState});

        cy.contains("button", "Start camera scan").click();
        cy.wrap(null).should(() => expect(getCameraPermissionState).to.have.been.calledOnce);
        cy.contains("button", "Stop camera scan").click();
        cy.contains("button", "Start camera scan").click();
        cy.get('[data-testid="alarm-qr-camera-status"]').should("contain.text", "Scanning");
        cy.then(() => resolvePermission("denied"));
        cy.get('[data-testid="alarm-qr-camera-status"]')
            .should("contain.text", "Scanning")
            .and("not.contain.text", "permission was denied");
        cy.then(() => {
            expect(harness.instances).to.have.length(2);
            expect(harness.instances[0].destroy).to.have.been.calledOnce;
            expect(harness.instances[1].destroy).not.to.have.been.called;
        });
    });

    it("keeps manual and image import paths available and tears down a live camera on import", () => {
        const harness = scannerHarness();
        const decodeTransport = Cypress.sinon.stub().resolves(transferDocument());
        const scanImage = Cypress.sinon.stub().resolves({data: "image-payload", cornerPoints: []});
        mountImport({...harness.props, decodeTransport, scanImage});

        cy.contains("button", "Scan QR image").should("be.visible");
        cy.contains("button", "Import alarm file").should("be.visible");
        cy.contains("button", "Start camera scan").click();
        cy.get("textarea:visible").type("manual-payload");
        cy.contains("button", "Decode payload").click();

        cy.contains("The alarm data passed its SHA-256 integrity check").should("be.visible");
        cy.then(() => {
            expect(decodeTransport).to.have.been.calledOnceWithExactly("manual-payload");
            expect(harness.instances[0].destroy).to.have.been.calledOnce;
            expect(harness.instances[0].trackStop).to.have.been.calledOnce;
        });
    });

    it("imports a saved QR image through the unchanged image path", () => {
        const scanImage = Cypress.sinon.stub().resolves({data: "image-payload", cornerPoints: []});
        const decodeTransport = Cypress.sinon.stub().resolves(transferDocument());
        mountImport({scanImage, decodeTransport});

        cy.get('[data-testid="alarm-qr-image-input"]').selectFile({
            contents: Cypress.Buffer.from("image"),
            fileName: "alarm-qr.png",
            mimeType: "image/png",
        }, {force: true});

        cy.contains("The alarm data passed its SHA-256 integrity check").should("be.visible");
        cy.then(() => {
            expect(scanImage).to.have.been.calledOnce;
            expect(decodeTransport).to.have.been.calledOnceWithExactly("image-payload");
        });
    });

    it("imports a saved alarm document through the unchanged file path", () => {
        cy.wrap(encodeAlarmTransfer(transferDocument().payload)).then(encoded => {
            mountImport({});
            cy.get('[data-testid="alarm-transfer-file-input"]').selectFile({
                contents: Cypress.Buffer.from(JSON.stringify(encoded)),
                fileName: "alarm.oscar-alarm.json",
                mimeType: "application/vnd.oscar.alarm+json",
            }, {force: true});
        });

        cy.contains("The alarm data passed its SHA-256 integrity check").should("be.visible");
        cy.get('[data-testid="alarm-transfer-import-uuid"]')
            .should("have.text", "123e4567-e89b-42d3-a456-426614174000");
    });
});
