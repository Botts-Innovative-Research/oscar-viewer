import {
    ALARM_TRANSFER_SCHEMA,
    ALARM_TRANSFER_VERSION,
    AlarmTransferPayload,
    MAX_ALARM_QR_CHARACTERS,
    base45Decode,
    base45Encode,
    buildAlarmTransfer,
    decodeAlarmTransfer,
    downsampleAlarmSeries,
    encodeAlarmTransfer,
    findThresholdCrossingIndices,
} from "../../src/lib/data/oscar/AlarmQrTransfer";
import {
    ALARM_QR_MAX_DISPLAY_PIXELS,
    ALARM_QR_QUIET_ZONE_MODULES,
    ALARM_QR_SOURCE_MODULE_SCALE,
    renderAlarmQrRaster,
} from "../../src/lib/data/oscar/AlarmQrRaster";
import QRCode from "qrcode";
import QrScanner from "qr-scanner";

const OCCUPANCY_UUID = "123e4567-e89b-42d3-a456-426614174000";

async function rejectionReason(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
        return "";
    } catch (error) {
        return String(error);
    }
}

function payload(): AlarmTransferPayload {
    return {
        schema: ALARM_TRANSFER_SCHEMA,
        version: ALARM_TRANSFER_VERSION,
        exportedAt: "2026-09-22T12:00:00.000Z",
        exportProfile: "qr-downsampled",
        source: {nodeId: "default", nodeName: "Local Node", laneId: "lane1"},
        event: {
            occupancyId: "1234",
            observationId: OCCUPANCY_UUID,
            startTime: "2026-09-22T11:59:50.000Z",
            endTime: "2026-09-22T12:00:00.000Z",
            status: "Gamma & Neutron",
            maxGamma: 1600,
            maxNeutron: 12,
        },
        series: {
            timeOrigin: "2026-09-22T11:59:50.000Z",
            gamma: {
                originalCount: 100,
                exportedCount: 5,
                points: [[0, 1000], [2000, 1200], [4000, 1600], [6000, 1250], [10000, 1000]],
                unit: "cps",
                downsampled: true,
            },
            neutron: {
                originalCount: 5,
                exportedCount: 5,
                points: [[0, 0], [2000, 4], [4000, 12], [6000, 4], [10000, 0]],
                unit: "cps",
                downsampled: false,
            },
            threshold: {
                originalCount: 100,
                exportedCount: 1,
                constant: 1250,
                unit: "cps",
                downsampled: true,
            },
            fullResolutionSha256: "a".repeat(64),
        },
        authenticity: {signed: false, notice: "integrity-only"},
    };
}

function densePoints(count: number, baseline: number, seed: number): [number, number][] {
    let state = seed >>> 0;
    let offset = 0;
    return Array.from({length: count}, () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        offset += 700 + state % 601;
        return [offset, Math.round((baseline + state % 100_000 / 1000) * 1000) / 1000];
    });
}

function densePayload(gammaCount: number, neutronCount: number, thresholdCount: number): AlarmTransferPayload {
    const result = payload();
    result.event.endTime = "2026-09-22T12:02:00.000Z";
    result.series.gamma = {
        originalCount: 300,
        exportedCount: gammaCount,
        points: densePoints(gammaCount, 1000, 1),
        unit: "cps",
        downsampled: true,
    };
    result.series.neutron = {
        originalCount: 150,
        exportedCount: neutronCount,
        points: densePoints(neutronCount, 5, 2),
        unit: "cps",
        downsampled: true,
    };
    result.series.threshold = {
        originalCount: 150,
        exportedCount: thresholdCount,
        points: densePoints(thresholdCount, 1250, 3),
        unit: "cps",
        downsampled: true,
    };
    return result;
}

async function imageDimensions(dataUrl: string): Promise<{width: number; height: number}> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({width: image.naturalWidth, height: image.naturalHeight});
        image.onerror = () => reject(new Error("Generated alarm QR PNG could not be loaded."));
        image.src = dataUrl;
    });
}

async function verifyRasterRoundTrip(
    source: AlarmTransferPayload,
    expectedVersion: number,
): Promise<{characters: number; sourcePixels: number; displayPixels: number}> {
    const encoded = await encodeAlarmTransfer(source);
    const raster = await renderAlarmQrRaster(encoded.transport);
    const sourceDimensions = await imageDimensions(raster.sourceDataUrl);
    const displayDimensions = await imageDimensions(raster.displayDataUrl);

    expect(raster.version).to.equal(expectedVersion);
    expect(raster.symbolModules).to.equal(17 + 4 * expectedVersion);
    expect(raster.totalModules).to.equal(raster.symbolModules + ALARM_QR_QUIET_ZONE_MODULES * 2);
    expect(raster.sourceModuleScale).to.equal(ALARM_QR_SOURCE_MODULE_SCALE);
    expect(raster.sourcePixelSize).to.equal(raster.totalModules * raster.sourceModuleScale);
    expect(raster.sourcePixelSize % raster.totalModules).to.equal(0);
    expect(sourceDimensions).to.deep.equal({width: raster.sourcePixelSize, height: raster.sourcePixelSize});
    expect(raster.displayModuleScale).to.be.greaterThan(0);
    expect(raster.displayPixelSize).to.equal(raster.totalModules * raster.displayModuleScale);
    expect(raster.displayPixelSize).to.be.at.most(ALARM_QR_MAX_DISPLAY_PIXELS);
    expect(displayDimensions).to.deep.equal({width: raster.displayPixelSize, height: raster.displayPixelSize});

    const [sourceScan, displayScan] = await Promise.all([
        QrScanner.scanImage(raster.sourceDataUrl, {returnDetailedScanResult: true}),
        QrScanner.scanImage(raster.displayDataUrl, {returnDetailedScanResult: true}),
    ]);
    expect(sourceScan.data).to.equal(encoded.transport);
    expect(displayScan.data).to.equal(encoded.transport);
    const decoded = await decodeAlarmTransfer(sourceScan.data);
    expect(decoded.payload).to.deep.equal(source);
    expect(decoded.integrity.digest).to.equal(encoded.integrity.digest);

    return {
        characters: encoded.transport.length,
        sourcePixels: raster.sourcePixelSize,
        displayPixels: raster.displayPixelSize,
    };
}

describe("OSCAR alarm QR transfer", () => {
    it("round-trips arbitrary bytes through Base45", () => {
        const source = Uint8Array.from([0, 1, 2, 15, 16, 127, 128, 254, 255]);
        expect(Array.from(base45Decode(base45Encode(source)))).to.deep.equal(Array.from(source));
    });

    it("retains endpoints and global extrema while downsampling", () => {
        const input = Array.from({length: 100}, (_, index) => ({
            timestamp: index * 100,
            value: index === 47 ? 5000 : index === 61 ? -25 : 1000 + Math.sin(index) * 20,
        }));
        const output = downsampleAlarmSeries(input, 16);
        expect(output).to.have.length(16);
        expect(output[0].timestamp).to.equal(input[0].timestamp);
        expect(output[0].value).to.equal(Number(input[0].value.toFixed(3)));
        expect(output[output.length - 1].timestamp).to.equal(input[input.length - 1].timestamp);
        expect(output[output.length - 1].value).to.equal(Number(input[input.length - 1].value.toFixed(3)));
        expect(output.some(point => point.value === 5000)).to.equal(true);
        expect(output.some(point => point.value === -25)).to.equal(true);
    });

    it("identifies both sides of threshold crossings", () => {
        const gamma = [1000, 1200, 1400, 1300, 1100].map((value, index) => ({timestamp: index, value}));
        const threshold = [{timestamp: 0, value: 1250}];
        expect(findThresholdCrossingIndices(gamma, threshold)).to.deep.equal([1, 2, 3, 4]);
    });

    it("encodes, verifies, and decodes a portable alarm", () => {
        cy.wrap(encodeAlarmTransfer(payload())).then(encoded => {
            expect(encoded.transport).to.match(/^OSCAR-ALARM:1:/);
            expect(encoded.transport.length).to.be.lessThan(2200);
            expect(encoded.transport).to.match(/^[0-9A-Z $%*+\-./:]+$/);
            expect(() => QRCode.create(encoded.transport, {errorCorrectionLevel: "M"})).not.to.throw();
            cy.wrap(decodeAlarmTransfer(encoded.transport)).then(decoded => {
                expect(decoded.payload).to.deep.equal(payload());
                expect(decoded.payload.event.observationId).to.equal(OCCUPANCY_UUID);
                expect(decoded.integrity.digest).to.equal(encoded.integrity.digest);
            });
        });
    });

    it("renders a module-aligned version 23 PNG that the production scanner decodes", () => {
        cy.then(async () => {
            const result = await verifyRasterRoundTrip(densePayload(20, 10, 10), 23);
            expect(result.characters).to.be.lessThan(MAX_ALARM_QR_CHARACTERS);
            expect(result.sourcePixels).to.equal(936);
            expect(result.displayPixels).to.equal(468);
        });
    });

    it("renders and decodes a practical module-aligned PNG at the one-code payload limit", () => {
        cy.then(async () => {
            const result = await verifyRasterRoundTrip(densePayload(60, 30, 30), 32);
            expect(result.characters).to.equal(MAX_ALARM_QR_CHARACTERS);
            expect(result.sourcePixels).to.equal(1224);
            expect(result.displayPixels).to.equal(459);
            expect(result.sourcePixels).to.be.at.most(1300);
        });
    });

    it("decodes a legacy version 1 transfer without an occupancy UUID", () => {
        const legacyPayload = payload();
        delete legacyPayload.event.observationId;

        cy.wrap(encodeAlarmTransfer(legacyPayload)).then(encoded => {
            expect(encoded.transport).to.match(/^OSCAR-ALARM:1:/);
            cy.wrap(decodeAlarmTransfer(encoded.transport)).then(decoded => {
                expect(decoded.payload.version).to.equal(1);
                expect(decoded.payload.event.observationId).to.equal(undefined);
            });
        });
    });

    it("rejects invalid occupancy UUID fields", () => {
        cy.then(async () => {
            for (const invalid of ["", " ", "x".repeat(129), 42] as unknown[]) {
                const invalidPayload = payload();
                (invalidPayload.event as any).observationId = invalid;
                expect(await rejectionReason(encodeAlarmTransfer(invalidPayload)))
                    .to.match(/invalid event UUID/i);
            }
        });
    });

    it("refuses to build a new export while the occupancy UUID is unresolved", () => {
        cy.then(async () => {
            const reason = await rejectionReason(buildAlarmTransfer(
                {occupancyObsId: ""} as any,
                {} as any,
            ));
            expect(reason).to.match(/event UUID is unavailable/i);
        });
    });

    it("rejects a changed transport payload", () => {
        cy.wrap(encodeAlarmTransfer(payload())).then(encoded => {
            const lastCharacter = encoded.transport.at(-1);
            const changed = encoded.transport.slice(0, -1) + (lastCharacter === "a" ? "b" : "a");

            cy.then(async () => {
                let failure: unknown;
                try {
                    await decodeAlarmTransfer(changed);
                } catch (error) {
                    failure = error;
                }
                expect(String(failure)).to.match(/integrity/i);
            });
        });
    });

    it("rejects malformed imported chart points", () => {
        const malformed = payload();
        malformed.series.gamma.points = [[Number.NaN, 1000]];
        malformed.series.gamma.exportedCount = 1;
        cy.then(async () => {
            let failure: unknown;
            try {
                await encodeAlarmTransfer(malformed);
            } catch (error) {
                failure = error;
            }
            expect(String(failure)).to.match(/invalid point/i);
        });
    });
});
