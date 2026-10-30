import QRCode from "qrcode";

export const ALARM_QR_ERROR_CORRECTION_LEVEL = "M" as const;
export const ALARM_QR_QUIET_ZONE_MODULES = 4;
export const ALARM_QR_SOURCE_MODULE_SCALE = 8;
export const ALARM_QR_MAX_DISPLAY_PIXELS = 520;

export interface AlarmQrRaster {
    sourceDataUrl: string;
    displayDataUrl: string;
    version: number;
    symbolModules: number;
    totalModules: number;
    sourceModuleScale: number;
    sourcePixelSize: number;
    displayModuleScale: number;
    displayPixelSize: number;
}

export type AlarmQrRasterLayout = Omit<AlarmQrRaster, "sourceDataUrl" | "displayDataUrl">;

/**
 * Calculates a module-aligned PNG and display layout for an OSCAR alarm QR.
 *
 * A fixed pixel width can split QR modules across fractional pixel boundaries,
 * which introduces aliasing before the image ever reaches a camera. Both the
 * downloadable raster and its normal desktop display therefore use an integer
 * number of pixels for every module, including the four-module quiet zone.
 */
export function alarmQrRasterLayout(transport: string): AlarmQrRasterLayout {
    if (!transport) throw new Error("Alarm QR transport is empty.");

    const qr = QRCode.create(transport, {errorCorrectionLevel: ALARM_QR_ERROR_CORRECTION_LEVEL});
    const symbolModules = qr.modules.size;
    const totalModules = symbolModules + ALARM_QR_QUIET_ZONE_MODULES * 2;
    const displayModuleScale = Math.max(
        1,
        Math.min(
            ALARM_QR_SOURCE_MODULE_SCALE,
            Math.floor(ALARM_QR_MAX_DISPLAY_PIXELS / totalModules),
        ),
    );

    return {
        version: qr.version,
        symbolModules,
        totalModules,
        sourceModuleScale: ALARM_QR_SOURCE_MODULE_SCALE,
        sourcePixelSize: totalModules * ALARM_QR_SOURCE_MODULE_SCALE,
        displayModuleScale,
        displayPixelSize: totalModules * displayModuleScale,
    };
}

export async function renderAlarmQrRaster(transport: string): Promise<AlarmQrRaster> {
    const layout = alarmQrRasterLayout(transport);
    const options = {
        type: "image/png" as const,
        errorCorrectionLevel: ALARM_QR_ERROR_CORRECTION_LEVEL,
        margin: ALARM_QR_QUIET_ZONE_MODULES,
        color: {dark: "#000000", light: "#ffffff"},
    };
    const [sourceDataUrl, displayDataUrl] = await Promise.all([
        QRCode.toDataURL(transport, {...options, scale: layout.sourceModuleScale}),
        QRCode.toDataURL(transport, {...options, scale: layout.displayModuleScale}),
    ]);
    return {...layout, sourceDataUrl, displayDataUrl};
}
