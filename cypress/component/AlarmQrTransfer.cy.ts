import {
    ALARM_TRANSFER_SCHEMA,
    ALARM_TRANSFER_VERSION,
    AlarmTransferPayload,
    base45Decode,
    base45Encode,
    buildAlarmTransfer,
    decodeAlarmTransfer,
    downsampleAlarmSeries,
    encodeAlarmTransfer,
    findThresholdCrossingIndices,
} from "../../src/lib/data/oscar/AlarmQrTransfer";
import QRCode from "qrcode";

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
